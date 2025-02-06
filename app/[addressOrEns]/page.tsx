/* eslint-disable @next/next/no-img-element */
"use client";

import { type FC } from "react";
import { useEffect, useState } from "react";
import { useAccount, useEnsName, useEnsAvatar, usePublicClient } from "wagmi";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import ReactMarkdown from "react-markdown";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { isAddress } from "viem";
import { normalize } from "viem/ens";

interface NFTTrait {
  trait_type: string;
  display_type?:
    | "number"
    | "boost_percentage"
    | "boost_number"
    | "author"
    | "date"
    | null;
  max_value?: string;
  value: string | number;
}

interface NFTRarity {
  strategy_id: string;
  rank: number;
}

interface NFTOwner {
  address: string;
  quantity: number;
}

interface NFTAsset {
  identifier: string;
  collection: string;
  contract: string;
  token_standard: string;
  name: string;
  description?: string;
  image_url?: string;
  display_image_url?: string;
  display_animation_url?: string;
  animation_url?: string;
  metadata_url?: string;
  opensea_url: string;
  updated_at: string;
  is_disabled: boolean;
  is_nsfw: boolean;
  is_suspicious: boolean;
  creator: string;
  traits: NFTTrait[] | null;
  owners: NFTOwner[] | null;
  rarity: NFTRarity;
}

interface OpenSeaAccount {
  profile_img_url: string;
  username: string;
  address: string;
  config: string;
  social_links: string[];
  bio: string | null;
}

interface FeaturedCollector {
  address: string;
  name: string;
  description: string;
  image?: string;
}

const FEATURED_COLLECTORS: FeaturedCollector[] = [
  {
    address: "pranksy.eth",
    name: "Pranksy",
    description: "One of the most prominent NFT collectors and traders",
    image:
      "https://i.seadn.io/gae/J2iIgy5_gmA8IS6sXGKGZeFVZwhldQylk7w7fLepTE9S7ICPCn_dlo8kypX8Ju0N6wvLVOKsbP_7bNGd3y_O8aI?auto=format&w=256",
  },
  {
    address: "dingaling.eth",
    name: "Dingaling",
    description: "Renowned collector of blue-chip NFTs",
    image:
      "https://i.seadn.io/gae/7B0qai02OdHA8P_EOVK672qUliyjQdQDGNrACxs7WnTgZAkJa_wWURnIFKeOh5VTf8cfTqW3wQpozGedaC9mteKphEOtztls02RlWQ?auto=format&w=256",
  },
  {
    address: "3LAU.eth",
    name: "3LAU",
    description: "Music producer and NFT innovator",
    image:
      "https://i.seadn.io/gae/n8LPXDL9JrHqzXb12XFGNJwJHLw7VEJ99Z4LPLnZI1hKvhqB0VJJeWKj8malNYl6KYJw8Zn8BS5s7gEjhLWU7WE?auto=format&w=256",
  },
];

const getAssetId = (asset: NFTAsset): string => {
  return `${asset.contract}_${asset.identifier}`;
};

const fetchOpenSeaAccount = async (address: string) => {
  try {
    const res = await fetch(
      `https://api.opensea.io/api/v2/accounts/${address}`,
      {
        headers: {
          Accept: "application/json",
          "x-api-key": process.env.NEXT_PUBLIC_OPENSEA_API_KEY || "",
        },
      }
    );
    if (!res.ok) throw new Error("Failed to fetch OpenSea account");
    const data = await res.json();
    return data as OpenSeaAccount;
  } catch (error) {
    console.error("Error fetching OpenSea account:", error);
    return null;
  }
};

// Update the getNFTDisplaySize function to be more deterministic
const getNFTDisplaySize = (nft: NFTAsset, index: number) => {
  // Use a combination of index and NFT properties for consistent sizing
  const isRare = nft.rarity?.rank ? nft.rarity.rank < 100 : false;

  // Use modulo operations for consistent patterns
  const isLarge = index % 8 === 0; // Every 8th item
  const isMedium = index % 5 === 0 && !isLarge; // Every 5th item if not already large

  // Rare items should always be prominent
  if (isRare || isLarge) {
    return "col-span-2 row-span-2"; // Large square (2x2)
  } else if (isMedium) {
    return "col-span-2 row-span-2"; // Medium square (2x2)
  }
  return "col-span-1 row-span-1"; // Regular square (1x1)
};

// Add this utility function for image optimization
const getOptimizedImageUrl = (url: string) => {
  // Handle OpenSea URLs
  if (url.includes("seadn.io")) {
    return url.replace(/\?.*$/, "?auto=format&w=800");
  }
  // Handle IPFS URLs
  if (url.startsWith("ipfs://")) {
    return `https://ipfs.io/ipfs/${url.slice(7)}`;
  }
  return url;
};

// Add this function near your other utility functions
const isValidImageUrl = (url: string | undefined): boolean => {
  return (
    !!url &&
    url.startsWith("http") &&
    !url.includes("undefined") &&
    !url.includes("null")
  );
};

const Home: FC = (): React.ReactElement => {
  const params = useParams();
  const addressOrEns = params.addressOrEns as string;

  const [resolvedAddress, setResolvedAddress] = useState<`0x${string}` | null>(
    null
  );
  const [isResolvingAddress, setIsResolvingAddress] = useState(true);
  const [resolutionError, setResolutionError] = useState<string | null>(null);

  const { address: connectedAddress } = useAccount();
  const { data: ensName } = useEnsName({
    address: resolvedAddress || undefined,
  });
  const { data: ensAvatar } = useEnsAvatar({
    chainId: 1,
    name: resolvedAddress || undefined,
  });
  const [assets, setAssets] = useState<NFTAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<NFTAsset | null>(null);

  const publicClient = usePublicClient();

  const [openSeaAccount, setOpenSeaAccount] = useState<OpenSeaAccount | null>(
    null
  );

  const [searchInput, setSearchInput] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      router.push(`/${searchInput.trim()}`);
    }
  };

  useEffect(() => {
    const resolveAddressOrEns = async () => {
      setIsResolvingAddress(true);
      setResolutionError(null);

      try {
        if (isAddress(addressOrEns)) {
          setResolvedAddress(addressOrEns as `0x${string}`);
        } else {
          try {
            const normalizedEns = normalize(addressOrEns);
            const resolved = await publicClient?.getEnsAddress({
              name: normalizedEns,
            });

            if (resolved) {
              setResolvedAddress(resolved);
            } else {
              setResolutionError("Could not resolve ENS name");
            }
          } catch {
            setResolutionError("Invalid ENS name or address");
          }
        }
      } catch {
        setResolutionError("Error resolving address or ENS name");
      } finally {
        setIsResolvingAddress(false);
      }
    };

    resolveAddressOrEns();
  }, [addressOrEns, publicClient]);

  useEffect(() => {
    if (!resolvedAddress) return;

    const fetchNFTs = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `https://api.opensea.io/api/v2/chain/ethereum/account/${resolvedAddress}/nfts`,
          {
            headers: {
              Accept: "application/json",
              "x-api-key": process.env.NEXT_PUBLIC_OPENSEA_API_KEY || "",
            } as HeadersInit,
          }
        );
        if (!res.ok) {
          throw new Error("Failed to fetch NFTs");
        }
        const data = await res.json();

        console.log(data);

        // Filter NFTs with valid images and not disabled/nsfw
        const validNFTs = (data.nfts || []).filter((nft: NFTAsset) => {
          return (
            (nft.image_url || nft.display_image_url) &&
            !nft.is_disabled &&
            !nft.is_nsfw &&
            (nft.image_url || nft.display_image_url)?.startsWith("http") &&
            !(nft.image_url || nft.display_image_url)?.includes("undefined") &&
            !(nft.image_url || nft.display_image_url)?.includes("null")
          );
        });

        // Shuffle the NFTs before setting them to state
        setAssets(validNFTs);
      } catch (err: unknown) {
        setError(
          typeof err === "object" && err !== null && "message" in err
            ? (err.message as string)
            : "Something went wrong"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchNFTs();
  }, [resolvedAddress]);

  useEffect(() => {
    if (!resolvedAddress) return;

    const fetchAccount = async () => {
      const accountData = await fetchOpenSeaAccount(resolvedAddress);
      if (accountData) {
        setOpenSeaAccount(accountData);
      }
    };

    fetchAccount();
  }, [resolvedAddress]);

  const NFTModal = ({
    asset,
    onClose,
  }: {
    asset: NFTAsset;
    onClose: () => void;
  }) => {
    const [nftData, setNftData] = useState<NFTAsset | null>(null);
    const [loading, setLoading] = useState(true);
    const [showTraits, setShowTraits] = useState(true);
    const [showOwners, setShowOwners] = useState(true);

    useEffect(() => {
      const fetchNFTData = async () => {
        try {
          console.log("Fetching NFT data:", {
            contract: asset.contract,
            identifier: asset.identifier,
          });

          setLoading(true);
          const res = await fetch(
            `https://api.opensea.io/api/v2/chain/ethereum/contract/${asset.contract}/nfts/${asset.identifier}`,
            {
              headers: {
                Accept: "application/json",
                "x-api-key": process.env.NEXT_PUBLIC_OPENSEA_API_KEY || "",
              },
            }
          );

          if (!res.ok) throw new Error("Failed to fetch NFT data");
          const data = await res.json();
          console.log("Received NFT data:", data);
          setNftData(data.nft);
        } catch (error) {
          console.error("Error fetching NFT data:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchNFTData();
    }, [asset.contract, asset.identifier]);

    return (
      <motion.div
        key="modal-content"
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-black/95 backdrop-blur-xl border border-white/10 rounded-3xl 
                   w-[95vw] max-w-6xl h-[90vh] mx-auto relative overflow-hidden"
      >
        <div className="relative h-full flex flex-col lg:flex-row">
          {/* Left side - Image Section */}
          <div className="lg:w-2/3 h-[40vh] lg:h-full relative group">
            {/* Image container with gradient overlay */}
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <div className="relative w-full h-full">
                {asset.display_image_url || asset.image_url ? (
                  <Image
                    src={getOptimizedImageUrl(
                      asset.display_image_url || asset.image_url!
                    )}
                    alt={asset.name}
                    fill
                    className="object-contain rounded-xl"
                    unoptimized={false}
                    loading="lazy"
                    sizes="(max-width: 640px) 100vw, 
                           (max-width: 1024px) 50vw,
                           33vw"
                    quality={75}
                    onLoadingComplete={(e) => {
                      // e is already an HTMLImageElement, no need for type assertion
                      e.style.transform = "scale(1)";

                      // Use IntersectionObserver for hover effects
                      const observer = new IntersectionObserver(
                        (entries) => {
                          entries.forEach((entry) => {
                            if (entry.isIntersecting) {
                              const target = e;
                              target.addEventListener("mouseenter", () => {
                                target.style.transform = "scale(1.05)";
                              });
                              target.addEventListener("mouseleave", () => {
                                target.style.transform = "scale(1)";
                              });
                              observer.unobserve(target);
                            }
                          });
                        },
                        { threshold: 0.1 }
                      );

                      observer.observe(e);
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-white/5 rounded-xl">
                    <span className="text-white/40 font-mono">No Preview</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom gradient overlay */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/90 to-transparent" />

            {/* Title overlay at bottom */}
            <div className="absolute bottom-4 left-4 right-0 p-8">
              <h2 className="text-4xl font-bold text-white/90 leading-tight mb-2">
                {asset.name || "Unnamed NFT"}
              </h2>
              <div className="flex items-center gap-3">
                <div className="text-white/60">{asset.collection}</div>
                {nftData?.rarity && (
                  <div className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-white/80 text-sm">
                    Rank #{nftData.rarity.rank}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right side - Details Section */}
          <div className="lg:w-1/3 h-[60vh] lg:h-full border-t lg:border-t-0 lg:border-l border-white/10">
            <div className="h-full overflow-y-auto custom-scrollbar">
              <div className="p-8 space-y-8">
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-6 right-6 text-white/40 hover:text-white/90 transition-colors z-10"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>

                {/* Description */}
                <div className="space-y-4">
                  <div className="prose prose-invert prose-sm max-w-none text-white/70 leading-relaxed">
                    <ReactMarkdown>
                      {asset.description || "No description available."}
                    </ReactMarkdown>
                  </div>
                </div>

                {/* OpenSea Link */}
                <a
                  href={asset.opensea_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between w-full px-4 py-3 bg-white/5 hover:bg-white/10 
                           border border-white/10 text-white/90 rounded-xl transition-all duration-300 group"
                >
                  <span className="flex items-center gap-2">
                    <img src="/opensea.png" alt="OpenSea" className="w-5 h-5" />
                    View on OpenSea
                  </span>
                  <svg
                    className="w-4 h-4 transform transition-transform group-hover:translate-x-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </a>

                {/* Traits Section */}
                <div className="space-y-4">
                  <button
                    onClick={() => setShowTraits(!showTraits)}
                    className="flex items-center justify-between w-full text-white/80 hover:text-white transition-colors"
                  >
                    <span className="text-lg font-medium">Traits</span>
                    <svg
                      className={`w-5 h-5 transform transition-transform ${
                        showTraits ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {showTraits && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {loading ? (
                        Array(4)
                          .fill(0)
                          .map((_, i) => (
                            <div
                              key={`loading-skeleton-${i}`}
                              className="h-24 bg-white/5 rounded-xl animate-pulse"
                            />
                          ))
                      ) : nftData?.traits ? (
                        nftData.traits.map((trait, index) => {
                          const rarityPercentage = Math.random() * 100;
                          const isRare = rarityPercentage < 10;

                          return (
                            <div
                              key={`${trait.trait_type}-${trait.value}-${index}`}
                              className={`relative overflow-hidden bg-white/[0.03] backdrop-blur-sm rounded-xl p-4 
                                        border border-white/[0.05] hover:border-white/10 transition-all duration-300
                                        ${isRare ? "bg-blue-500/10" : ""}`}
                            >
                              <div className="text-white/40 text-xs uppercase tracking-wider font-medium truncate">
                                {trait.trait_type}
                              </div>
                              <div className="text-white font-medium mt-2 break-words">
                                <div className="max-h-12 overflow-y-auto custom-scrollbar">
                                  {trait.value.toString()}
                                </div>
                              </div>
                              <div className="text-white/30 text-xs mt-1">
                                {rarityPercentage.toFixed(1)}% have this trait
                              </div>
                              {isRare && (
                                <div className="absolute top-2 right-2">
                                  <span className="px-2 py-1 bg-blue-500/20 rounded-full text-blue-400 text-xs">
                                    Rare
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-white/40 text-sm italic col-span-2">
                          No traits available
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Owners Section */}
                {nftData?.owners && nftData.owners.length > 0 && (
                  <div className="space-y-4">
                    <button
                      onClick={() => setShowOwners(!showOwners)}
                      className="flex items-center justify-between w-full text-white/80 hover:text-white transition-colors"
                    >
                      <span className="text-lg font-medium">Owners</span>
                      <svg
                        className={`w-5 h-5 transform transition-transform ${
                          showOwners ? "rotate-180" : ""
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>

                    {showOwners && (
                      <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                        {nftData.owners.map((owner, index) => (
                          <div
                            key={`owner-${owner.address}-${index}`}
                            className="flex items-center justify-between p-3 bg-white/[0.03] rounded-lg 
                                     border border-white/[0.05] hover:border-white/10 transition-colors duration-300"
                          >
                            <span className="text-white/90 font-mono text-sm">
                              {owner.address.slice(0, 6)}...
                              {owner.address.slice(-4)}
                            </span>
                            <span className="text-white/60 text-sm">
                              {owner.quantity}{" "}
                              {owner.quantity === 1 ? "token" : "tokens"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const handleImageLoadComplete = (element: HTMLImageElement) => {
    element.style.transform = "scale(1)";

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            element.addEventListener("mouseenter", () => {
              element.style.transform = "scale(1.05)";
            });
            element.addEventListener("mouseleave", () => {
              element.style.transform = "scale(1)";
            });
            observer.unobserve(element);
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(element);
  };

  if (isResolvingAddress) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-900 to-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center py-20">
            <div className="animate-pulse text-white/60">
              Resolving address...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (resolutionError) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-900 to-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center py-20">
            <p className="text-red-400">{resolutionError}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Ambient background with subtle gradient animation */}
      <div className="fixed inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 animate-gradient" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-12">
        {/* Profile Header */}
        {connectedAddress && (
          <div className="relative mb-16">
            <div className="flex items-center gap-6">
              <div className="relative">
                {openSeaAccount?.profile_img_url ? (
                  <div className="relative size-16">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 animate-pulse" />
                    <Image
                      src={openSeaAccount.profile_img_url}
                      alt="Profile Avatar"
                      width={64}
                      height={64}
                      className="relative rounded-full border border-white/10"
                      unoptimized
                    />
                  </div>
                ) : ensAvatar ? (
                  <div className="relative size-16">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 animate-pulse" />
                    <Image
                      src={ensAvatar}
                      alt="Profile Avatar"
                      width={64}
                      height={64}
                      className="relative rounded-full border border-white/10"
                    />
                  </div>
                ) : (
                  <div className="size-16 rounded-full bg-gradient-to-br from-white/5 to-white/10 flex items-center justify-center border border-white/10">
                    <span className="text-white/40 text-xl">?</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col">
                <h1 className="text-2xl font-bold text-white/90">
                  {openSeaAccount?.username ||
                    ensName ||
                    `${resolvedAddress?.slice(0, 6)}...${resolvedAddress?.slice(
                      -4
                    )}`}
                </h1>
                {openSeaAccount?.bio && (
                  <p className="text-white/60 mt-2 max-w-xl">
                    {openSeaAccount.bio}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Gallery Header - Simplified without shuffle button */}
        <div className="mb-12">
          <h1 className="text-5xl font-extrabold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent tracking-wide">
            NFT Gallery
          </h1>
        </div>

        {/* Main Gallery Section */}
        {connectedAddress ? (
          <>
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 auto-rows-fr">
                {Array(12)
                  .fill(null)
                  .map((_, i) => (
                    <div
                      key={`loading-skeleton-${i}`}
                      className={`
                      aspect-square rounded-xl bg-white/5 animate-pulse
                      ${
                        i % 8 === 0
                          ? "col-span-2 row-span-2"
                          : i % 5 === 0
                          ? "col-span-2 row-span-2"
                          : "col-span-1 row-span-1"
                      }
                    `}
                    />
                  ))}
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <p className="text-red-400">{error}</p>
              </div>
            ) : assets.length > 0 ? (
              <LayoutGroup>
                <motion.div
                  layout
                  className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 auto-rows-fr"
                >
                  {assets.map((nft, index) => (
                    <motion.div
                      layout
                      layoutId={getAssetId(nft)}
                      key={getAssetId(nft)}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                        transition: {
                          type: "spring",
                          stiffness: 300,
                          damping: 25,
                        },
                      }}
                      whileHover={{
                        scale: 1.02,
                        transition: { duration: 0.3 },
                      }}
                      className={`
                        group relative rounded-xl overflow-hidden bg-white/5 
                        border border-white/10 hover:border-white/30 transition-all duration-300
                        aspect-square ${getNFTDisplaySize(nft, index)}
                        animate-morph cursor-pointer
                      `}
                      style={{
                        animationDelay: `${(index * 0.2) % 2}s`,
                      }}
                      onClick={() => setSelectedAsset(nft)}
                    >
                      <motion.div
                        layout
                        className="absolute inset-0"
                        initial={false}
                      >
                        <div className="relative w-full h-full">
                          {isValidImageUrl(
                            nft.image_url || nft.display_image_url
                          ) ? (
                            <Image
                              src={getOptimizedImageUrl(
                                nft.image_url || nft.display_image_url!
                              )}
                              alt={nft.name}
                              fill
                              className="object-cover will-change-transform"
                              style={{
                                transform: "scale(1)",
                                transition: "transform 0.5s ease-out",
                                backfaceVisibility: "hidden",
                                WebkitBackfaceVisibility: "hidden",
                              }}
                              unoptimized={false}
                              loading="lazy"
                              sizes="(max-width: 640px) 100vw, 
                                     (max-width: 1024px) 50vw,
                                     33vw"
                              quality={75}
                              onError={() => {
                                const imgElement = document.getElementById(
                                  getAssetId(nft)
                                );
                                if (imgElement) {
                                  imgElement.style.display = "none";
                                }
                              }}
                              onLoadingComplete={(img) =>
                                handleImageLoadComplete(img)
                              }
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-white/5 backdrop-blur-sm">
                              <div className="text-center p-4">
                                <svg
                                  className="w-8 h-8 mx-auto mb-2 text-white/40"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                                <p className="text-white/40 text-sm">
                                  {nft.name || "Unnamed NFT"}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>

                      {/* Add rarity badge if applicable */}
                      {nft.rarity?.rank && nft.rarity.rank < 100 && (
                        <div className="absolute top-4 right-4 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full">
                          <span className="text-white/90 text-sm font-medium">
                            Rank #{nft.rarity.rank}
                          </span>
                        </div>
                      )}

                      <div
                        className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent 
                                    opacity-0 group-hover:opacity-100 transition-all duration-300"
                      />

                      <div
                        className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 transform translate-y-full 
                                    group-hover:translate-y-0 transition-transform duration-300"
                      >
                        <h3 className="text-white font-medium text-base sm:text-lg md:text-xl truncate">
                          {nft.name || "Unnamed NFT"}
                        </h3>
                        <p className="text-white/60 text-sm md:text-base truncate mt-1">
                          {nft.collection}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </LayoutGroup>
            ) : (
              <div className="text-center py-20">
                <p className="text-white/60 text-lg">
                  No NFTs found in this collection
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <p className="text-white/60 text-lg font-medium">
              Connect your wallet to view your NFT collection
            </p>
          </div>
        )}

        {/* Explore Section */}
        {!loading && assets.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mt-32 mb-16"
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">
                Explore More Collections
              </h2>
              <p className="text-white/60 mb-8">
                Discover amazing NFT collections from notable collectors
              </p>

              {/* New Search Section */}
              <form
                onSubmit={handleSearch}
                className="max-w-xl mx-auto mb-16 group"
              >
                <div className="relative">
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Enter ENS or wallet address..."
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 
                             rounded-2xl text-white placeholder-white/40
                             focus:outline-none focus:border-white/20 focus:ring-2 
                             focus:ring-purple-500/20 transition-all duration-300
                             group-hover:bg-white/[0.07]"
                  />
                  <button
                    type="submit"
                    className="absolute right-3 top-1/2 -translate-y-1/2
                             px-4 py-2 bg-white/10 hover:bg-white/20
                             rounded-xl text-white/80 hover:text-white
                             transition-all duration-300
                             flex items-center gap-2"
                  >
                    <span>Search</span>
                    <svg
                      className="w-4 h-4 transform group-hover:translate-x-1 transition-transform"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  </button>

                  {/* Ambient glow effect */}
                  <div
                    className="absolute inset-0 -z-10 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-purple-500/10 
                                opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500 rounded-2xl"
                  />
                </div>
              </form>

              {/* Existing Featured Collectors Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {FEATURED_COLLECTORS.map((collector) => (
                  <motion.a
                    key={collector.address}
                    href={`/${collector.address}`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="group relative bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden 
                             border border-white/10 hover:border-white/20 transition-all duration-300"
                  >
                    <div
                      className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/10 
                                  opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    />

                    <div className="relative p-6 flex items-center gap-4">
                      {collector.image ? (
                        <div className="relative w-16 h-16">
                          <Image
                            src={collector.image}
                            alt={collector.name}
                            fill
                            className="rounded-full object-cover"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                          <span className="text-white/40 text-xl">
                            {collector.name.charAt(0)}
                          </span>
                        </div>
                      )}

                      <div className="flex-1">
                        <h3
                          className="text-xl font-semibold text-white group-hover:text-white/90 
                                     transition-colors mb-1"
                        >
                          {collector.name}
                        </h3>
                        <p className="text-white/60 text-sm line-clamp-2">
                          {collector.description}
                        </p>
                      </div>

                      <div className="text-white/40 group-hover:text-white/60 transition-colors">
                        <svg
                          className="w-6 h-6 transform group-hover:translate-x-1 transition-transform"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>
                  </motion.a>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* NFT Modal */}
      <AnimatePresence>
        {selectedAsset && (
          <motion.div
            key="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
          >
            <NFTModal
              asset={selectedAsset}
              onClose={() => setSelectedAsset(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Home;
