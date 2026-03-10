// src/app/api/odoo/smart-products/lib/utils.js

export function uniq(arr) {
  return Array.from(new Set(arr || []));
}



/**
 * Concurrency-limited async mapper.
 * Returns an array of results in the same order as input.
*/



export async function mapWithConcurrency(items, worker, concurrency = 5) {
  const list = items || [];
  const out = new Array(list.length);
  let i = 0;

  async function runOne() {
    while (true) {
      const idx = i++;
      if (idx >= list.length) return;
      out[idx] = await worker(list[idx], idx);
    }
  }

  const runners = Array.from({ length: Math.min(concurrency, list.length) }, () => runOne());
  await Promise.all(runners);
  return out;
}


