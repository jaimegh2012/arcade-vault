"use server";

import { Resend } from "resend";

export type ContactFields = { name: string; email: string; msg: string };

export type ContactState =
  | { status: "idle" }
  | { status: "success"; name: string }
  | { status: "error"; message: string; fields: ContactFields };

const NAME_MAX = 80;
const EMAIL_MAX = 254;
const MSG_MAX = 2000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const GENERIC_ERROR = "No se pudo enviar el mensaje. Inténtalo de nuevo más tarde.";

function field(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function sendContact(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const fields: ContactFields = {
    name: field(formData, "name"),
    email: field(formData, "email"),
    msg: field(formData, "msg"),
  };

  // Honeypot: un bot rellena el campo oculto. Fingimos éxito sin enviar nada.
  if (field(formData, "website") !== "") {
    return { status: "success", name: fields.name };
  }

  const fail = (message: string): ContactState => ({ status: "error", message, fields });

  if (!fields.name || fields.name.length > NAME_MAX) {
    return fail(`NOMBRE inválido (1-${NAME_MAX} caracteres).`);
  }
  if (!fields.email || fields.email.length > EMAIL_MAX || !EMAIL_RE.test(fields.email)) {
    return fail("CORREO ELECTRÓNICO inválido.");
  }
  if (!fields.msg || fields.msg.length > MSG_MAX) {
    return fail(`MENSAJE inválido (1-${MSG_MAX} caracteres).`);
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !to || !from) {
    console.error("[contact] Faltan variables de entorno: RESEND_API_KEY, CONTACT_TO_EMAIL o RESEND_FROM");
    return fail(GENERIC_ERROR);
  }

  // Sin saltos de línea en el asunto (evita inyección de cabeceras)
  const subjectName = fields.name.replace(/[\r\n]+/g, " ");

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to,
      replyTo: fields.email,
      subject: `[Arcade Vault] Mensaje de ${subjectName}`,
      text: `Nombre: ${fields.name}\nCorreo: ${fields.email}\n\nMensaje:\n${fields.msg}\n`,
    });
    if (error) {
      console.error("[contact] Resend devolvió error:", error);
      return fail(GENERIC_ERROR);
    }
  } catch (err) {
    console.error("[contact] Error enviando con Resend:", err);
    return fail(GENERIC_ERROR);
  }

  return { status: "success", name: fields.name };
}
