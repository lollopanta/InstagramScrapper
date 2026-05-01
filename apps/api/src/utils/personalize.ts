type PersonalizationLead = {
  username: string;
  fullName?: string | null;
  publicEmail?: string | null;
};

export function personalize(template: string, lead: PersonalizationLead) {
  return template
    .replaceAll("{{name}}", lead.fullName || lead.username)
    .replaceAll("{{username}}", lead.username)
    .replaceAll("{{email}}", lead.publicEmail ?? "");
}
