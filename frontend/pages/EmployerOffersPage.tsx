import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { useAuthedBackend } from "../hooks/useAuthedBackend";
import { OfferList } from "../components/offers/OfferList";
import { OfferDetail } from "../components/offers/OfferDetail";
import type { Offer, OfferStatus } from "~backend/offers/types";
import type { EmployerNegotiateRequest } from "~backend/offers/negotiate";

type View = "list" | "detail";

export default function EmployerOffersPage() {
  const api = useAuthedBackend();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OfferStatus | "all">("all");
  const [view, setView] = useState<View>("list");
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);

  const load = useCallback(async () => {
    if (!api) return;
    try {
      const res = await api.offers.listOffers({});
      setOffers(res.offers);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const handleView = async (offer: Offer) => {
    try {
      const full = await api!.offers.getOffer({ offerId: offer.offerId });
      setSelectedOffer(full);
      setView("detail");
    } catch (e: unknown) {
      console.error(e);
    }
  };

  const handleEmployerAction = async (req: Omit<EmployerNegotiateRequest, "offerId">): Promise<Offer> => {
    const updated = await api!.offers.employerNegotiate({ ...req, offerId: selectedOffer!.offerId });
    setOffers((prev) => prev.map((o) => o.offerId === updated.offerId ? updated : o));
    setSelectedOffer(updated);
    return updated;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Sent Offers</h2>
      </div>

      {view === "list" && (
        <OfferList
          offers={offers}
          statusFilter={statusFilter}
          onStatusFilter={setStatusFilter}
          onView={handleView}
          role="EMPLOYER"
        />
      )}

      {view === "detail" && selectedOffer && (
        <OfferDetail
          offer={selectedOffer}
          role="EMPLOYER"
          onBack={() => { setView("list"); setSelectedOffer(null); }}
          onEmployerAction={handleEmployerAction}
        />
      )}
    </div>
  );
}
