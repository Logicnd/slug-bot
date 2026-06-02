function parseOwners() {
  const raw = process.env.OWNER_WHITELIST || "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const OWNERS = parseOwners();

function isOwner(id) {
  if (!id) return false;
  return OWNERS.includes(String(id));
}

module.exports = { isOwner, OWNERS };
