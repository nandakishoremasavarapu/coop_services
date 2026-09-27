import { db } from "./index";
import {
  users,
  federations,
  societies,
  customerProfiles,
  providerProfiles,
  serviceCategories,
  specificServices,
  skills,
  providerSkills,
  bookings,
  quotes,
  payments,
  invoices,
  ratings,
  notifications,
  welfareRecords,
  identityVerifications,
} from "./schema";
import { createHash } from "crypto";

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export async function seedDatabase(targetDb?: any) {
  const activeDb = targetDb || db;
  console.log("Seeding database...");

  // Seed Service Categories
  const categoryData = [
    { name: "Electrical Services", icon: "Zap", description: "Fan repair, switchboard repair, wiring, lighting", sortOrder: 1 },
    { name: "Plumbing Services", icon: "Droplets", description: "Pipes, taps, leakage, drainage and related plumbing work", sortOrder: 2 },
    { name: "Carpentry Services", icon: "Hammer", description: "Furniture, woodwork, doors, cabinets and repairs", sortOrder: 3 },
    { name: "Painting Services", icon: "Paintbrush", description: "Interior/exterior painting and touch-up work", sortOrder: 4 },
    { name: "Cleaning Services", icon: "Sparkles", description: "Home, office, deep and routine cleaning", sortOrder: 5 },
    { name: "Gardening & Landscaping", icon: "Leaf", description: "Gardening, lawn, plant and basic landscaping services", sortOrder: 6 },
    { name: "Driver Services", icon: "Car", description: "On-demand and scheduled driver services", sortOrder: 7 },
    { name: "Technical & Appliance Services", icon: "Wrench", description: "Appliance and technical repair/maintenance", sortOrder: 8 },
    { name: "Domestic Help Services", icon: "Home", description: "Routine household assistance", sortOrder: 9 },
    { name: "Caregiving Services", icon: "Heart", description: "Care and support for dependents", sortOrder: 10 },
    { name: "Masonry & Construction", icon: "Building2", description: "Basic civil, masonry and repair work", sortOrder: 11 },
    { name: "AC & Cooling Services", icon: "Wind", description: "AC/cooling installation, service and maintenance", sortOrder: 12 },
    { name: "Laundry & Dry Cleaning", icon: "WashingMachine", description: "Collection, cleaning, ironing and return services", sortOrder: 13 },
    { name: "Moving & Shifting", icon: "Truck", description: "Local packing, loading, transport and shifting", sortOrder: 14 },
    { name: "Security Services", icon: "Shield", description: "Guard/security support through authorized providers", sortOrder: 15 },
    { name: "Beauty & Personal Care", icon: "Scissors", description: "At-home personal care services", sortOrder: 16 },
    { name: "Pest Control Services", icon: "Bug", description: "Pest inspection/control through qualified providers", sortOrder: 17 },
    { name: "Home Maintenance", icon: "Tool", description: "General maintenance jobs", sortOrder: 18 },
    { name: "Vehicle Services", icon: "CarFront", description: "Vehicle cleaning/basic maintenance", sortOrder: 19 },
    { name: "Education & Tutoring", icon: "BookOpen", description: "Tutoring and educational support", sortOrder: 20 },
    { name: "Agricultural & Farm Services", icon: "Tractor", description: "Farm/garden labour and agricultural support", sortOrder: 21 },
    { name: "Glass & Aluminium Services", icon: "Square", description: "Glass, aluminium frames and related installation/repair", sortOrder: 22 },
    { name: "Welding & Fabrication", icon: "Flame", description: "Welding, metal fabrication and repair", sortOrder: 23 },
    { name: "Computer & Digital Services", icon: "Monitor", description: "Computer, printer and basic digital support", sortOrder: 24 },
    { name: "Sanitation & Waste Management", icon: "Trash2", description: "Sanitation, waste-handling and related services", sortOrder: 25 },
  ];

  const insertedCategories = await activeDb
    .insert(serviceCategories)
    .values(categoryData)
    .onConflictDoNothing()
    .returning();

  console.log(`Inserted ${insertedCategories.length} service categories`);

  // Seed specific services for first few categories
  if (insertedCategories.length > 0) {
    const electricalCat = insertedCategories.find((c: any) => c.name === "Electrical Services");
    const plumbingCat = insertedCategories.find((c: any) => c.name === "Plumbing Services");
    const cleaningCat = insertedCategories.find((c: any) => c.name === "Cleaning Services");
    const carpCat = insertedCategories.find((c: any) => c.name === "Carpentry Services");
    const paintCat = insertedCategories.find((c: any) => c.name === "Painting Services");

    const specificServicesData = [];
    if (electricalCat) {
      specificServicesData.push(
        { categoryId: electricalCat.id, name: "Fan Installation / Repair" },
        { categoryId: electricalCat.id, name: "Switchboard / Socket Repair" },
        { categoryId: electricalCat.id, name: "Home Wiring" },
        { categoryId: electricalCat.id, name: "Light Fitting" },
        { categoryId: electricalCat.id, name: "Inverter / Battery Service" },
        { categoryId: electricalCat.id, name: "Other Electrical Work" }
      );
    }
    if (plumbingCat) {
      specificServicesData.push(
        { categoryId: plumbingCat.id, name: "Tap / Faucet Repair" },
        { categoryId: plumbingCat.id, name: "Pipe Leakage Fix" },
        { categoryId: plumbingCat.id, name: "Drain Cleaning" },
        { categoryId: plumbingCat.id, name: "Toilet / Commode Repair" },
        { categoryId: plumbingCat.id, name: "Water Tank Cleaning" },
        { categoryId: plumbingCat.id, name: "Other Plumbing Work" }
      );
    }
    if (cleaningCat) {
      specificServicesData.push(
        { categoryId: cleaningCat.id, name: "Home Deep Cleaning" },
        { categoryId: cleaningCat.id, name: "Office Cleaning" },
        { categoryId: cleaningCat.id, name: "Kitchen Cleaning" },
        { categoryId: cleaningCat.id, name: "Bathroom Cleaning" },
        { categoryId: cleaningCat.id, name: "Sofa / Carpet Cleaning" },
        { categoryId: cleaningCat.id, name: "Other Cleaning Work" }
      );
    }
    if (carpCat) {
      specificServicesData.push(
        { categoryId: carpCat.id, name: "Furniture Repair" },
        { categoryId: carpCat.id, name: "Door / Window Repair" },
        { categoryId: carpCat.id, name: "Cabinet Assembly" },
        { categoryId: carpCat.id, name: "Other Carpentry Work" }
      );
    }
    if (paintCat) {
      specificServicesData.push(
        { categoryId: paintCat.id, name: "Interior Painting" },
        { categoryId: paintCat.id, name: "Exterior Painting" },
        { categoryId: paintCat.id, name: "Touch-up / Patch Painting" },
        { categoryId: paintCat.id, name: "Other Painting Work" }
      );
    }

    if (specificServicesData.length > 0) {
      await activeDb.insert(specificServices).values(specificServicesData).onConflictDoNothing();
    }
  }

  // Seed Federation
  const [federation] = await activeDb
    .insert(federations)
    .values({
      name: "Kerala Labour Federation",
      region: "Kerala",
      status: "active",
    })
    .onConflictDoNothing()
    .returning();

  // Seed Societies
  let societyA: { id: string } | undefined;
  let societyB: { id: string } | undefined;
  if (federation) {
    const insertedSocieties = await activeDb
      .insert(societies)
      .values([
        {
          federationId: federation.id,
          name: "Thiruvananthapuram Workers Cooperative Society",
          serviceArea: "Thiruvananthapuram",
          address: "MG Road, Thiruvananthapuram, Kerala",
          status: "active",
        },
        {
          federationId: federation.id,
          name: "Ernakulam Labour Cooperative Society",
          serviceArea: "Ernakulam",
          address: "MG Road, Ernakulam, Kerala",
          status: "active",
        },
      ])
      .onConflictDoNothing()
      .returning();
    societyA = insertedSocieties[0];
    societyB = insertedSocieties[1];
  }

  // Seed Users
  const adminPassword = hashPassword("admin123");
  const userPassword = hashPassword("password123");

  const insertedUsers = await activeDb
    .insert(users)
    .values([
      // Federation Admin
      { phone: "9000000001", email: "fed.admin@coop.in", passwordHash: adminPassword, role: "federation_admin" },
      // Society Admin A
      { phone: "9000000002", email: "society.admin.tvm@coop.in", passwordHash: adminPassword, role: "society_admin" },
      // Society Admin B
      { phone: "9000000003", email: "society.admin.ekm@coop.in", passwordHash: adminPassword, role: "society_admin" },
      // Customers
      { phone: "9100000001", email: "customer1@example.com", passwordHash: userPassword, role: "customer" },
      { phone: "9100000002", email: "customer2@example.com", passwordHash: userPassword, role: "customer" },
      { phone: "9100000003", email: "customer3@example.com", passwordHash: userPassword, role: "customer" },
      // Providers
      { phone: "9200000001", email: "provider1@coop.in", passwordHash: userPassword, role: "provider" },
      { phone: "9200000002", email: "provider2@coop.in", passwordHash: userPassword, role: "provider" },
      { phone: "9200000003", email: "provider3@coop.in", passwordHash: userPassword, role: "provider" },
      { phone: "9200000004", email: "provider4@coop.in", passwordHash: userPassword, role: "provider" },
      { phone: "9200000005", email: "provider5@coop.in", passwordHash: userPassword, role: "provider" },
    ])
    .onConflictDoNothing()
    .returning();

  console.log(`Inserted ${insertedUsers.length} users`);

  const fedAdmin = insertedUsers.find((u: any) => u.role === "federation_admin");
  const societyAdmins = insertedUsers.filter((u: any) => u.role === "society_admin");
  const customers = insertedUsers.filter((u: any) => u.role === "customer");
  const providers = insertedUsers.filter((u: any) => u.role === "provider");

  // Link admins to society
  if (federation && fedAdmin) {
    await activeDb.update(federations).set({ adminUserId: fedAdmin.id });
  }

  // Customer profiles
  if (customers.length >= 3) {
    await activeDb.insert(customerProfiles).values([
      { userId: customers[0].id, fullName: "Priya Menon", gender: "female", address: "45 Pattom Road", city: "Thiruvananthapuram", pincode: "695004", latitude: "8.5241", longitude: "76.9366" },
      { userId: customers[1].id, fullName: "Rajan Kumar", gender: "male", address: "12 MG Road", city: "Ernakulam", pincode: "682016", latitude: "9.9312", longitude: "76.2673" },
      { userId: customers[2].id, fullName: "Anjali Krishnan", gender: "female", address: "78 Statue Junction", city: "Thiruvananthapuram", pincode: "695001", latitude: "8.4855", longitude: "76.9492" },
    ]).onConflictDoNothing();
  }

  // Provider profiles
  if (providers.length >= 5 && societyA && societyB) {
    const providerProfileData = [
      {
        userId: providers[0].id,
        societyId: societyA.id,
        displayName: "Suresh Electrician",
        experience: 8,
        serviceArea: "Thiruvananthapuram",
        city: "Thiruvananthapuram",
        pincode: "695004",
        latitude: "8.5241",
        longitude: "76.9366",
        availability: "available" as const,
        verificationStatus: "verified" as const,
        ratingAvg: "4.7",
        ratingCount: 43,
        bio: "Certified electrician with 8 years experience. Cooperative member since 2018.",
      },
      {
        userId: providers[1].id,
        societyId: societyA.id,
        displayName: "Mohanan Plumber",
        experience: 12,
        serviceArea: "Thiruvananthapuram",
        city: "Thiruvananthapuram",
        pincode: "695004",
        latitude: "8.5300",
        longitude: "76.9400",
        availability: "available" as const,
        verificationStatus: "verified" as const,
        ratingAvg: "4.5",
        ratingCount: 67,
        bio: "Expert plumber with 12 years of household and commercial experience.",
      },
      {
        userId: providers[2].id,
        societyId: societyA.id,
        displayName: "Sreeja Cleaner",
        experience: 5,
        serviceArea: "Thiruvananthapuram",
        city: "Thiruvananthapuram",
        pincode: "695001",
        latitude: "8.4900",
        longitude: "76.9500",
        availability: "busy" as const,
        verificationStatus: "verified" as const,
        ratingAvg: "4.9",
        ratingCount: 89,
        bio: "Professional cleaning specialist for homes and offices.",
      },
      {
        userId: providers[3].id,
        societyId: societyB.id,
        displayName: "Vijayan Carpenter",
        experience: 15,
        serviceArea: "Ernakulam",
        city: "Ernakulam",
        pincode: "682016",
        latitude: "9.9312",
        longitude: "76.2673",
        availability: "available" as const,
        verificationStatus: "verified" as const,
        ratingAvg: "4.6",
        ratingCount: 112,
        bio: "Master carpenter with expertise in furniture and interior woodwork.",
      },
      {
        userId: providers[4].id,
        societyId: societyB.id,
        displayName: "Lakshmi Helper",
        experience: 3,
        serviceArea: "Ernakulam",
        city: "Ernakulam",
        pincode: "682016",
        latitude: "9.9200",
        longitude: "76.2600",
        availability: "available" as const,
        verificationStatus: "pending" as const,
        ratingAvg: "4.3",
        ratingCount: 18,
        bio: "Domestic help specialist trained in household management.",
      },
    ];

    const insertedProvProfiles = await activeDb.insert(providerProfiles).values(providerProfileData).onConflictDoNothing().returning();

    // Identity verifications
    if (insertedProvProfiles.length > 0) {
      const verificationData = insertedProvProfiles.map((p: any, i: number) => ({
        userId: providers[i]?.id ?? p.userId,
        method: "aadhaar",
        status: p.verificationStatus === "verified" ? ("verified" as const) : ("pending" as const),
        verifiedAt: p.verificationStatus === "verified" ? new Date() : undefined,
        notes: p.verificationStatus === "verified" ? "Verified by society admin" : "Pending review",
      }));
      await activeDb.insert(identityVerifications).values(verificationData).onConflictDoNothing();

      // Welfare records
      for (const pp of insertedProvProfiles.slice(0, 3)) {
        await activeDb.insert(welfareRecords).values({
          providerId: pp.id,
          scheme: "Kerala Labour Welfare Fund",
          policyRef: `KLWF-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
          status: "active",
          startDate: "2023-01-01",
          endDate: "2025-12-31",
          claimStatus: "none",
        }).onConflictDoNothing();
      }
    }

    // Skills and Provider Skills
    if (insertedCategories.length > 0 && insertedProvProfiles.length > 0) {
      const elCat = insertedCategories.find((c: any) => c.name === "Electrical Services");
      const plCat = insertedCategories.find((c: any) => c.name === "Plumbing Services");
      const clCat = insertedCategories.find((c: any) => c.name === "Cleaning Services");
      const caCat = insertedCategories.find((c: any) => c.name === "Carpentry Services");
      const domCat = insertedCategories.find((c: any) => c.name === "Domestic Help Services");

      const skillsData = [];
      if (elCat) skillsData.push({ categoryId: elCat.id, name: "Fan Repair" }, { categoryId: elCat.id, name: "Wiring" }, { categoryId: elCat.id, name: "Panel Work" });
      if (plCat) skillsData.push({ categoryId: plCat.id, name: "Pipe Fitting" }, { categoryId: plCat.id, name: "Drainage" }, { categoryId: plCat.id, name: "Water Tank" });
      if (clCat) skillsData.push({ categoryId: clCat.id, name: "Deep Cleaning" }, { categoryId: clCat.id, name: "Carpet Cleaning" });
      if (caCat) skillsData.push({ categoryId: caCat.id, name: "Furniture Repair" }, { categoryId: caCat.id, name: "Door Fitting" });
      if (domCat) skillsData.push({ categoryId: domCat.id, name: "Household Assistance" }, { categoryId: domCat.id, name: "Cooking Support" });

      if (skillsData.length > 0) {
        const insertedSkills = await activeDb.insert(skills).values(skillsData).onConflictDoNothing().returning();

        // Link skills to providers
        if (insertedSkills.length > 0 && insertedProvProfiles.length >= 5) {
          const pvSkills = [];
          const elSkills = insertedSkills.filter((s: any) => s.name === "Fan Repair" || s.name === "Wiring");
          const plSkills = insertedSkills.filter((s: any) => s.name === "Pipe Fitting" || s.name === "Drainage");
          const clSkills = insertedSkills.filter((s: any) => s.name === "Deep Cleaning");
          const caSkills = insertedSkills.filter((s: any) => s.name === "Furniture Repair");
          const domSkills = insertedSkills.filter((s: any) => s.name === "Household Assistance");

          for (const sk of elSkills) pvSkills.push({ providerId: insertedProvProfiles[0].id, skillId: sk.id, yearsExp: 8 });
          for (const sk of plSkills) pvSkills.push({ providerId: insertedProvProfiles[1].id, skillId: sk.id, yearsExp: 12 });
          for (const sk of clSkills) pvSkills.push({ providerId: insertedProvProfiles[2].id, skillId: sk.id, yearsExp: 5 });
          for (const sk of caSkills) pvSkills.push({ providerId: insertedProvProfiles[3].id, skillId: sk.id, yearsExp: 15 });
          for (const sk of domSkills) pvSkills.push({ providerId: insertedProvProfiles[4].id, skillId: sk.id, yearsExp: 3 });

          if (pvSkills.length > 0) {
            await activeDb.insert(providerSkills).values(pvSkills).onConflictDoNothing();
          }
        }
      }
    }
  }

  // Seed sample bookings
  if (customers.length >= 2 && providers.length >= 2 && insertedCategories.length > 0 && societyA) {
    const elCat = insertedCategories.find((c: any) => c.name === "Electrical Services");
    const plCat = insertedCategories.find((c: any) => c.name === "Plumbing Services");

    const sampleBookings = [
      {
        customerId: customers[0].id,
        providerId: providers[0].id,
        societyId: societyA.id,
        categoryId: elCat?.id,
        serviceDescription: "My ceiling fan is making a loud noise and running slowly. Need urgent check.",
        address: "45 Pattom Road, Thiruvananthapuram",
        city: "Thiruvananthapuram",
        pincode: "695004",
        latitude: "8.5241",
        longitude: "76.9366",
        status: "paid" as const,
        finalPrice: "450.00",
        platformFee: "45.00",
        totalAmount: "495.00",
        preferredTime: new Date(Date.now() - 86400000 * 2),
      },
      {
        customerId: customers[1].id,
        providerId: providers[1].id,
        societyId: societyA.id,
        categoryId: plCat?.id,
        serviceDescription: "Bathroom tap is leaking continuously. Need immediate repair.",
        address: "12 MG Road, Ernakulam",
        city: "Ernakulam",
        pincode: "682016",
        latitude: "9.9312",
        longitude: "76.2673",
        status: "work_started" as const,
        finalPrice: "380.00",
        platformFee: "38.00",
        totalAmount: "418.00",
        preferredTime: new Date(),
      },
      {
        customerId: customers[0].id,
        categoryId: elCat?.id,
        serviceDescription: "Need to install 3 new light fixtures in the living room.",
        address: "45 Pattom Road, Thiruvananthapuram",
        city: "Thiruvananthapuram",
        pincode: "695004",
        latitude: "8.5241",
        longitude: "76.9366",
        status: "quoted" as const,
        preferredTime: new Date(Date.now() + 86400000),
      },
    ];

    const insertedBookings = await activeDb.insert(bookings).values(sampleBookings).onConflictDoNothing().returning();

    // Add quotes for the third booking
    if (insertedBookings.length >= 3 && providers.length >= 2) {
      await activeDb.insert(quotes).values([
        {
          bookingId: insertedBookings[2].id,
          providerId: providers[0].id,
          amount: "850.00",
          note: "Will use quality fixtures. Can come tomorrow morning.",
          version: 1,
          status: "submitted",
          estimatedArrival: "9:00 AM tomorrow",
        },
        {
          bookingId: insertedBookings[2].id,
          providerId: providers[1].id,
          amount: "750.00",
          note: "Experienced with light installations. Can come this evening.",
          version: 1,
          status: "submitted",
          estimatedArrival: "5:00 PM today",
        },
      ]).onConflictDoNothing();
    }

    // Add payment and invoice for first completed booking
    if (insertedBookings.length >= 1) {
      const [payment] = await activeDb.insert(payments).values({
        bookingId: insertedBookings[0].id,
        method: "online",
        expectedAmount: "495.00",
        paidAmount: "495.00",
        status: "success",
        transactionRef: `TXN${Date.now()}`,
      }).onConflictDoNothing().returning();

      await activeDb.insert(invoices).values({
        bookingId: insertedBookings[0].id,
        invoiceNumber: `INV-${Date.now()}`,
        serviceAmount: "450.00",
        platformFee: "45.00",
        totalAmount: "495.00",
        paymentStatus: "paid",
        issuedAt: new Date(),
      }).onConflictDoNothing();

      await activeDb.insert(ratings).values({
        bookingId: insertedBookings[0].id,
        customerId: customers[0].id,
        providerId: providers[0].id,
        rating: 5,
        reviewText: "Excellent work! Fixed the fan quickly and professionally. Very happy with the service.",
      }).onConflictDoNothing();
    }
  }

  console.log("Database seeded successfully!");
}
