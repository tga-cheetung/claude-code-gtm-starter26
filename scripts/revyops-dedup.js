const linkedinUrl = `{{linkedin_url}}`;
// Replace with your RevyOps master API key (see .env.example)
const apiKey = 'YOUR_REVYOPS_MASTER_API_KEY';

const url = `https://app.revyops.com/api/public/contacts-master-list?linkedin_url=${encodeURIComponent(linkedinUrl)}`;

return (async () => {
  try {
    const r = await fetch(url, { headers: { 'x-api-key': apiKey } });
    if (!r.ok) return JSON.stringify({ is_duplicate: false, revyops_status: 'error_' + r.status, revyops_contact_id: null });
    const c = await r.json();
    if (Array.isArray(c) && c.length > 0) return JSON.stringify({ is_duplicate: true, revyops_status: c[0].contact_status || 'exists', revyops_contact_id: c[0].id });
    return JSON.stringify({ is_duplicate: false, revyops_status: 'new', revyops_contact_id: null });
  } catch(e) {
    return JSON.stringify({ is_duplicate: false, revyops_status: 'error_' + e.message, revyops_contact_id: null });
  }
})();
