// /learn/[book]/[chapter] — one chapter's full learning flow (client world).
import { notFound } from "next/navigation";
import { getChapter, bookInfo, validBook } from "@/lib/learn/artifacts";
import { ChapterWorld } from "@/components/learn/chapter-world";

export default async function ChapterPage({ params }: { params: Promise<{ book: string; chapter: string }> }) {
  const { book, chapter } = await params;
  if (!validBook(book)) notFound();
  const num = Number(chapter);
  if (!Number.isInteger(num)) notFound();
  const data = getChapter(book, num);
  if (!data) notFound();
  void bookInfo(book);
  return <ChapterWorld chapter={data} />;
}
