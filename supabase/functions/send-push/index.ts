// Edge Function : envoie une notification Web Push quand un événement survient
// (nouveau message, cadeau, kill d'un ami, demande d'ami).
//
// Déclenchée par un Database Webhook Supabase (INSERT sur `messages` / `friendships`).
//
// Variables d'environnement (secrets) à définir :
//   VAPID_PUBLIC_KEY   — clé publique VAPID
//   VAPID_PRIVATE_KEY  — clé privée VAPID
//   VAPID_SUBJECT      — "mailto:ton-email@example.com" (optionnel)
//   WEBHOOK_SECRET     — secret partagé (optionnel mais recommandé)
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — fournis automatiquement par Supabase
//
// Déploiement :
//   supabase functions deploy send-push --no-verify-jwt

import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT") || "mailto:example@example.com",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET") || "";

Deno.serve(async (req) => {
  // Sécurité optionnelle : vérifie un secret partagé passé par le webhook.
  if (WEBHOOK_SECRET) {
    const provided = req.headers.get("x-webhook-secret");
    if (provided !== WEBHOOK_SECRET) {
      return new Response("unauthorized", { status: 401 });
    }
  }

  let payload: any = {};
  try {
    payload = await req.json();
  } catch (_) {
    return new Response("bad json", { status: 200 });
  }

  // Un Database Webhook envoie { type, table, record, old_record, schema }
  const table = payload.table;
  const record = payload.record || payload;

  let toUserId: string | undefined;
  let title = "My Little Penguin 🐧";
  let body = "";
  const url = "./";

  try {
    if (table === "messages") {
      toUserId = record.to_id;
      let fromName = "Un ami";
      if (record.from_id) {
        const { data: prof } = await supabase
          .from("profiles").select("pseudo").eq("id", record.from_id).maybeSingle();
        if (prof?.pseudo) fromName = prof.pseudo;
      }
      const isKill = typeof record.text === "string" && record.text.indexOf("tuer sa banquise") !== -1;
      if (isKill) {
        title = "Banquise tuée ☠️";
        body = record.text || "Un ami a réinitialisé sa banquise.";
      } else if (record.animal) {
        title = fromName;
        body = "t'a envoyé un cadeau : " + record.animal + " 🎁";
      } else {
        title = fromName;
        body = record.text || "Nouveau message";
      }
    } else if (table === "friendships") {
      // On ne notifie que la création d'une demande en attente.
      if (record.status && record.status !== "pending") {
        return new Response("skip", { status: 200 });
      }
      toUserId = record.user_b;
      title = "Nouvelle demande d'ami 🐧";
      body = "Un explorateur veut rejoindre ton aventure !";
    } else {
      return new Response("ignored", { status: 200 });
    }

    if (!toUserId) return new Response("no recipient", { status: 200 });

    const { data: subs } = await supabase
      .from("push_subscriptions").select("*").eq("user_id", toUserId);

    if (!subs || subs.length === 0) {
      return new Response("no subscriptions", { status: 200 });
    }

    const notif = JSON.stringify({
      title,
      body,
      url,
      tag: table + "_" + (record.id ?? ""),
      icon: "./icons/app-icon.png",
      badge: "./icons/app-icon.png",
    });

    await Promise.all(subs.map(async (s: any) => {
      const subscription = {
        endpoint: s.endpoint,
        keys: { p256dh: s.p256dh, auth: s.auth },
      };
      try {
        await webpush.sendNotification(subscription, notif);
      } catch (err: any) {
        // 404 / 410 → abonnement expiré : on le nettoie.
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
        }
      }
    }));

    return new Response("ok", { status: 200 });
  } catch (e) {
    // On renvoie 200 pour éviter que le webhook ne réessaie en boucle.
    return new Response("error: " + (e as Error).message, { status: 200 });
  }
});
