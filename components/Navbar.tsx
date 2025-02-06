"use client";

import Link from "next/link";

export default function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      {/* Enhanced gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/50 to-transparent pointer-events-none" />

      {/* Subtle animated background blur */}
      <div className="absolute inset-0 backdrop-blur-md bg-black/20" />

      <nav className="relative mx-auto flex max-w-7xl items-center justify-between px-8 py-6">
        <div className="flex items-center">
          <Link
            href="/"
            className="group flex items-center gap-3 transition-all duration-300"
          >
            {/* Logo container with gradient border */}
            <div className="relative size-10">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 animate-pulse" />
              <div className="absolute inset-[1px] rounded-xl bg-black/90 backdrop-blur-xl flex items-center justify-center">
                <span className="font-bold text-white/90 text-lg">N</span>
              </div>
            </div>

            <div className="flex flex-col">
              <span className="text-white/90 font-medium tracking-tight text-lg">
                NFT Gallery
              </span>
              <span className="text-white/40 text-xs tracking-wider">
                CURATED COLLECTION
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-6">
          {/* Optional: Add navigation links */}
          <div className="hidden md:flex items-center gap-8">
            <a
              href="#"
              className="text-white/60 hover:text-white/90 transition-colors text-sm"
            >
              Explore
            </a>
            <a
              href="#"
              className="text-white/60 hover:text-white/90 transition-colors text-sm"
            >
              Collections
            </a>
            <a
              href="#"
              className="text-white/60 hover:text-white/90 transition-colors text-sm"
            >
              About
            </a>
          </div>

          <div className="relative">
            {/* @ts-expect-error msg */}
            <appkit-button className="!relative !overflow-hidden " />
          </div>
        </div>
      </nav>
    </header>
  );
}
