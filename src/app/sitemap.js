function backendOrigin() {
  const raw = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || '';
  const withApi = raw || 'http://localhost:5001/api';
  return withApi.replace(/\/?api\/?$/, '') || 'http://localhost:5001';
}

export default async function sitemap() {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://www.koott.in";

  const staticRoutes = [
    "", 
    "/about", 
    "/online-child-psychologist", 
    "/blog",
    "/faq",
    "/career",
    "/events",
    "/events/Koott-summer-workshops-2026",
    "/therapy-agreement", 
    "/privacy-policy", 
    "/terms-and-conditions", 
    "/refund-policy"
  ].map(
    (route) => ({
      url: `${baseUrl}${route}`,
      changeFrequency: "monthly",
      priority: route === "" ? 1.0 : route === "/blog" || route === "/online-child-psychologist" ? 0.9 : 0.7,
      lastModified: new Date(),
    })
  );

  async function fetchSlugs(path) {
    try {
      const apiBase = backendOrigin();
      const res = await fetch(`${apiBase}${path}?limit=100`, { next: { revalidate: 600 } });
      if (!res.ok) return [];
      const data = await res.json();
      const items =
        data?.data?.services ||
        data?.data?.assessments ||
        data?.data?.pages ||
        data?.data?.blogs ||
        data?.message?.services ||
        data?.message?.assessments ||
        data?.message?.pages ||
        data?.message?.blogs ||
        data?.services ||
        data?.assessments ||
        data?.pages ||
        data?.blogs ||
        data?.data ||
        [];
      return (items || [])
        .filter((item) => item?.status === "published" && item?.slug)
        .map((item) => item.slug);
    } catch {
      return [];
    }
  }

  async function fetchPsychologists() {
    try {
      const apiBase = backendOrigin();
      const res = await fetch(`${apiBase}/api/public/psychologists`, { next: { revalidate: 600 } });
      if (!res.ok) return [];
      const data = await res.json();
      const psychologists = 
        data?.data?.psychologists ||
        data?.message?.psychologists ||
        data?.psychologists ||
        [];
      return (psychologists || [])
        .filter((psych) => {
          const name = psych?.name || `${psych?.first_name || ''} ${psych?.last_name || ''}`.trim();
          return name;
        })
        .map((psych) => {
          const name = psych.name || `${psych.first_name || ''} ${psych.last_name || ''}`.trim();
          return name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        });
    } catch {
      return [];
    }
  }

  const [counsellingSlugs, assessmentSlugs, parentingSlugs, blogSlugs, psychologistSlugs] = await Promise.all([
    fetchSlugs("/api/counselling"),
    fetchSlugs("/api/assessments"),
    fetchSlugs("/api/better-parenting"),
    fetchSlugs("/api/blogs"),
    fetchPsychologists(),
  ]);

  const dynamicRoutes = [
    ...counsellingSlugs.map((slug) => ({
      url: `${baseUrl}/counselling/${slug}`,
      changeFrequency: "weekly",
      priority: 0.8,
      lastModified: new Date(),
    })),
    ...assessmentSlugs.map((slug) => ({
      url: `${baseUrl}/assessments/${slug}`,
      changeFrequency: "weekly",
      priority: 0.8,
      lastModified: new Date(),
    })),
    ...parentingSlugs.map((slug) => ({
      url: `${baseUrl}/better-parenting/${slug}`,
      changeFrequency: "weekly",
      priority: 0.8,
      lastModified: new Date(),
    })),
    ...blogSlugs.map((slug) => ({
      url: `${baseUrl}/blog/${slug}`,
      changeFrequency: "weekly",
      priority: 0.7,
      lastModified: new Date(),
    })),
    ...psychologistSlugs.map((slug) => ({
      url: `${baseUrl}/online-child-psychologist/${slug}`,
      changeFrequency: "monthly",
      priority: 0.9,
      lastModified: new Date(),
    })),
  ];

  return [...staticRoutes, ...dynamicRoutes];
}
