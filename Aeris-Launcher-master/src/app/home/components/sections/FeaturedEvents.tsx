"use client";

import { Config } from "@/app/config/config";
import { useEffect, useState } from "react";
import { useTheme } from "@/app/utils/hooks/theme";

interface NewsItem {
  id: number;
  about: {
    author: string;
    date: string;
    image: string;
    tag?: string;
  };
  body: {
    title: string;
    message: string;
  };
}

export function FeaturedEvents() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const colors = useTheme();

  useEffect(() => {
    const getNews = async () => {
      try {
        const response = await fetch(
          `${Config.NEWS_API_URL}/launcher/api/news`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (!response.ok) return;
        const data = await response.json();
        setNews(data?.slice(0, 6) || []);
      } catch {}
    };
    getNews();
  }, []);

  if (!news.length) return null;

  return (
    <div className={`px-8 py-6 ${colors.current.background}`}>
      <h2 className="text-xl font-bold text-white mb-4">Featured Events</h2>
      <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
        {news.map((item, i) => (
          <EventCard key={item.id ?? i} item={item} />
        ))}
      </div>
    </div>
  );
}

function EventCard({ item }: { item: NewsItem }) {
  return (
    <div
      className="relative flex-shrink-0 cursor-pointer group overflow-hidden rounded-xl"
      style={{ width: "280px", height: "160px" }}
    >
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
        style={{
          backgroundImage: item.about.image
            ? `url(${item.about.image})`
            : "linear-gradient(135deg, #374151, #1f2937)",
        }}
      />
      {/* Overlay */}
      <div className="absolute inset-0" style={{
        background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)"
      }} />

      {/* Content */}
      <div className="absolute bottom-0 left-0 p-3">
        {item.about.tag && (
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "#a78bfa" }}>
            {item.about.tag}
          </p>
        )}
        <p className="text-white font-bold text-sm leading-snug line-clamp-2">
          {item.body.title}
        </p>
      </div>
    </div>
  );
}
