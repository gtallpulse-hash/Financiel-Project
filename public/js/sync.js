// Synchroniseren met /api/sync. Zonder bereik blijven wijzigingen wachten
// (ze staan al op het toestel) en gaan bij de volgende poging mee.
export async function synchroniseer(store, { fetchFn = fetch, url = '/api/sync' } = {}) {
  const sleutel = store.instellingen().sleutel;
  if (!sleutel) return { status: 'uit' };
  const wijz = store.wijzigingen();
  let res;
  try {
    res = await fetchFn(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + sleutel },
      body: JSON.stringify({ since: store.sync().since, changes: wijz }),
    });
  } catch {
    return { status: 'offline' };
  }
  if (res.status === 401) return { status: 'sleutel' };
  if (!res.ok) return { status: 'fout' };
  const data = await res.json();
  const nieuw = store.voegSamen(data.items);
  store.syncKlaar(Math.max(0, data.nu - 5000), wijz.reduce((m, w) => Math.max(m, w.t), 0));
  return { status: 'ok', nieuw, verzonden: wijz.length };
}
