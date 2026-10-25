import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const root = path.resolve(__dirname, '../../');
const seedDir = path.join(root, 'seed');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const bucket = process.env.STORAGE_BUCKET || 'paintings';

function mapSeed(raw) {
  return {
    currency: raw.currency || 'INR',
    paintings: raw.paintings || raw.artworks || [],
    potteryItems: raw.potteryItems || raw.items || raw.pottery_items || [],
    glazes: raw.glazes || raw.colors || [],
    wallRate: raw.mural?.ratePerSqFt ?? raw.wallRatePerSqft ?? raw.wall_rate_per_sqft ?? 150
  };
}

async function findSeedFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await findSeedFiles(full));
    else if (/\.(json|csv)$/i.test(entry.name)) files.push(full);
  }
  return files;
}

async function loadSeed() {
  const files = await findSeedFiles(seedDir);
  const jsonFile = files.find((file) => path.basename(file).toLowerCase() === 'seed.json') || files.find((file) => file.endsWith('.json'));
  if (!jsonFile) throw new Error('No JSON or CSV seed data found in seed/.');
  const raw = JSON.parse(await fs.readFile(jsonFile, 'utf8'));
  console.log(`Found seed data: ${path.relative(root, jsonFile)}`);
  return mapSeed(raw);
}

async function ensureUser(email, password, role, fullName) {
  const { data: existing } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  let user = existing.users.find((item) => item.email === email);
  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName } });
    if (error) throw error;
    user = data.user;
  }
  const { error } = await supabase.from('profiles').upsert({ id: user.id, full_name: fullName, role }, { onConflict: 'id' });
  if (error) throw error;
}

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Fill SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env first.');
  const data = await loadSeed();
  const { error: bucketError } = await supabase.storage.createBucket(bucket, { public: true });
  if (bucketError && !/already exists/i.test(bucketError.message)) console.log(`Storage bucket note: ${bucketError.message}`);
  for (const painting of data.paintings) {
    const source = path.join(seedDir, painting.imageUrl || painting.image_url || '');
    let imageUrl = painting.imageUrl || painting.image_url || null;
    if (await fileExists(source)) {
      const fileName = path.basename(source);
      const file = await fs.readFile(source);
      const { error } = await supabase.storage.from(bucket).upload(fileName, file, { contentType: 'image/jpeg', upsert: true });
      if (error) console.log(`Image upload note for ${fileName}: ${error.message}`);
      imageUrl = supabase.storage.from(bucket).getPublicUrl(fileName).data.publicUrl;
    }
    const catalog = { title: painting.title, artist: painting.artist, description: painting.description, medium: painting.medium || inferMedium(painting.description), dimensions: painting.dimensions || inferDimensions(painting.description), year: painting.year || null, price: painting.price, image_url: imageUrl };
    const { data: existing } = await supabase.from('paintings').select('id').eq('title', painting.title).maybeSingle();
    const result = existing
      ? await supabase.from('paintings').update(catalog).eq('id', existing.id)
      : await supabase.from('paintings').insert({ ...catalog, status: painting.status === 'sold' ? 'sold' : 'available' });
    if (result.error) throw result.error;
  }
  for (const item of data.potteryItems) {
    const { error } = await supabase.from('pottery_items').upsert({ name: item.name, description: item.description || null, price: item.price ?? null, source_id: item.id || null }, { onConflict: 'name' });
    if (error) throw error;
  }
  for (const glaze of data.glazes) {
    const { error } = await supabase.from('glazes').upsert({ name: glaze.name, description: glaze.description || null, color_hex: glaze.colorHex || glaze.color_hex || colorFor(glaze.name), price: glaze.price ?? null, source_id: glaze.id || null }, { onConflict: 'name' });
    if (error) throw error;
  }
  const { error: rateError } = await supabase.from('settings').upsert({ key: 'wall_rate_per_sqft', value: String(data.wallRate) });
  if (rateError) throw rateError;
  await ensureUser(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD, 'admin', 'Studio Admin');
  await ensureUser(process.env.DEMO_CUSTOMER_EMAIL, process.env.DEMO_CUSTOMER_PASSWORD, 'customer', 'Demo Customer');
  console.log(`Seed complete: ${data.paintings.length} paintings, ${data.potteryItems.length} pottery items, ${data.glazes.length} glazes, INR ${data.wallRate}/sq ft.`);
}

async function fileExists(file) { try { await fs.access(file); return true; } catch { return false; } }
function inferMedium(description = '') { return description.split('.')[0] || null; }
function inferDimensions(description = '') { return description.match(/\d+\s*x\s*\d+\s*cm/i)?.[0] || null; }
function colorFor(name = '') { const colors = { red: '#B84132', yellow: '#E3B229', green: '#4E8F54', blue: '#405B9B', beige: '#D5B589', black: '#252525' }; return Object.entries(colors).find(([key]) => name.toLowerCase().includes(key))?.[1] || '#C9A77B'; }
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
