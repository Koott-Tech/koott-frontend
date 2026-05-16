import BlogPost from "@/components/BlogPost";

export default function BlogPostPage({ params }) {
  const { slug } = params;
  return (
    <main>
      <BlogPost slug={slug} />
    </main>
  );
}
