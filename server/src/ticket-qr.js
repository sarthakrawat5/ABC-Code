import QRCode from "qrcode";

export function createTicketQr(ticket) {
  const payload = JSON.stringify({
    issuer: "nexus-club",
    ticketId: ticket.id,
    code: ticket.ticket_code
  });
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 240,
    color: { dark: "#17211d", light: "#ffffff" }
  });
}
