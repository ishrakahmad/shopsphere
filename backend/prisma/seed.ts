import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

function slugify(text: string) {
  return text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-');
}

async function main() {
  console.log('🌱 Seeding database...');

  // ---- Admin user ----
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@shopsphere.com' },
    update: {},
    create: {
      name: 'ShopSphere Admin',
      email: 'admin@shopsphere.com',
      password: adminPassword,
      role: Role.ADMIN,
    },
  });
  console.log(`✔ Admin user: admin@shopsphere.com / Admin@123`);

  // ---- Demo customer ----
  const customerPassword = await bcrypt.hash('Customer@123', 10);
  const customer = await prisma.user.upsert({
    where: { email: 'customer@shopsphere.com' },
    update: {},
    create: {
      name: 'Demo Customer',
      email: 'customer@shopsphere.com',
      password: customerPassword,
      role: Role.CUSTOMER,
    },
  });
  await prisma.cart.upsert({
    where: { userId: customer.id },
    update: {},
    create: { userId: customer.id },
  });
  console.log(`✔ Demo customer: customer@shopsphere.com / Customer@123`);

  // ---- Categories ----
  const categoryNames = ['Electronics', 'Fashion', 'Home & Living', 'Beauty & Health', 'Sports & Outdoors'];
  const categories: any[] = [];
  for (const name of categoryNames) {
    const category = await prisma.category.upsert({
      where: { slug: slugify(name) },
      update: {},
      create: { name, slug: slugify(name), description: `${name} products` },
    });
    categories.push(category);
  }
  console.log(`✔ ${categories.length} categories created`);

  // ---- Products ----
  const sampleProducts = [
    { name: 'Wireless Bluetooth Headphones', price: 59.99, discountPrice: 44.99, stock: 150, featured: true, newArrival: false, bestSeller: true, flashSale: false, category: 0 },
    { name: 'Smart Watch Series 5', price: 129.99, discountPrice: null, stock: 80, featured: true, newArrival: true, bestSeller: false, flashSale: false, category: 0 },
    { name: '4K Action Camera', price: 89.99, discountPrice: 69.99, stock: 60, featured: false, newArrival: true, bestSeller: false, flashSale: true, category: 0 },
    { name: "Men's Denim Jacket", price: 45.0, discountPrice: null, stock: 100, featured: false, newArrival: true, bestSeller: false, flashSale: false, category: 1 },
    { name: "Women's Running Shoes", price: 65.0, discountPrice: 49.99, stock: 120, featured: true, newArrival: false, bestSeller: true, flashSale: true, category: 1 },
    { name: 'Classic Leather Wallet', price: 25.0, discountPrice: null, stock: 200, featured: false, newArrival: false, bestSeller: true, flashSale: false, category: 1 },
    { name: 'Aromatherapy Diffuser', price: 32.99, discountPrice: 24.99, stock: 90, featured: true, newArrival: true, bestSeller: false, flashSale: false, category: 2 },
    { name: 'Non-Stick Cookware Set', price: 79.99, discountPrice: null, stock: 40, featured: false, newArrival: false, bestSeller: true, flashSale: false, category: 2 },
    { name: 'Vitamin C Serum', price: 19.99, discountPrice: 14.99, stock: 250, featured: true, newArrival: false, bestSeller: true, flashSale: true, category: 3 },
    { name: 'Electric Toothbrush', price: 34.99, discountPrice: null, stock: 110, featured: false, newArrival: true, bestSeller: false, flashSale: false, category: 3 },
    { name: 'Yoga Mat Premium', price: 28.0, discountPrice: 19.99, stock: 140, featured: false, newArrival: false, bestSeller: true, flashSale: false, category: 4 },
    { name: 'Adjustable Dumbbell Set', price: 149.99, discountPrice: null, stock: 30, featured: true, newArrival: true, bestSeller: false, flashSale: false, category: 4 },
  ];

  for (const p of sampleProducts) {
    const slug = slugify(p.name);
    await prisma.product.upsert({
      where: { slug },
      update: {},
      create: {
        name: p.name,
        slug,
        description: `${p.name} — premium quality, fast shipping, and hassle-free returns. A best-in-class choice from ShopSphere.`,
        price: p.price,
        discountPrice: p.discountPrice ?? undefined,
        stock: p.stock,
        sku: `SKU-${slug.toUpperCase().slice(0, 10)}-${Math.floor(Math.random() * 9000 + 1000)}`,
        images: [],
        isFeatured: p.featured,
        isNewArrival: p.newArrival,
        isBestSeller: p.bestSeller,
        isFlashSale: p.flashSale,
        flashSaleEnd: p.flashSale ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) : null,
        categoryId: categories[p.category].id,
        createdById: admin.id,
      },
    });
  }
  console.log(`✔ ${sampleProducts.length} products created`);

  console.log('🌱 Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
