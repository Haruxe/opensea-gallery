"use client";

import { useAccount } from "wagmi";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const { address, isConnected } = useAccount();
  const router = useRouter();

  // Redirect to profile if wallet is connected
  useEffect(() => {
    if (isConnected && address) {
      router.push(`/${address}`);
    }
  }, [isConnected, address, router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
      {/* Ambient background with animated gradient */}
      <div className="fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/10 animate-gradient" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_black_100%)]" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-8"
        >
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="relative size-24">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 animate-pulse" />
              <div className="absolute inset-[2px] rounded-2xl bg-black/90 backdrop-blur-xl flex items-center justify-center">
                <span className="font-bold text-white/90 text-4xl">N</span>
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-white via-white/90 to-white/80 bg-clip-text text-transparent">
            NFT Gallery
          </h1>

          {/* Description */}
          <p className="text-white/60 text-lg sm:text-xl max-w-xl mx-auto leading-relaxed">
            Connect your wallet to explore your NFT collection in an elegant,
            interactive gallery experience.
          </p>

          {/* Connect Wallet Button */}
          <div className="pt-8">
            <div className="relative inline-block group">
              {/* Animated glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/50 to-blue-500/50 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-all duration-500" />

              {/* AppKit Button */}
              <div className="relative">
                {/* @ts-expect-error Server Component */}
                <appkit-button className="!relative !overflow-hidden" />
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10"
            >
              <h3 className="text-white/90 font-semibold text-lg mb-2">
                Interactive Display
              </h3>
              <p className="text-white/60">
                View your NFTs in a beautiful, responsive gallery with smooth
                animations and transitions.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10"
            >
              <h3 className="text-white/90 font-semibold text-lg mb-2">
                Detailed Information
              </h3>
              <p className="text-white/60">
                Access comprehensive details about your NFTs, including traits,
                rarity, and ownership history.
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
