import { computed, unref, type Ref } from "vue";

type OfferIdSource = string | null | undefined | Ref<string | null | undefined>;

const normalizeOfferId = (value: unknown) => {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return String(record._id || record.id || record.offer || record.offerId || "").trim();
  }
  return String(value).trim();
};

export function useOfferNavigation(offerId?: OfferIdSource) {
  const resolvedOfferId = computed(() => normalizeOfferId(unref(offerId)));

  const offerUrl = computed(() => (
    resolvedOfferId.value ? `/go/offer/${encodeURIComponent(resolvedOfferId.value)}` : ""
  ));

  const openOffer = (overrideOfferId?: string | null, target = "_blank") => {
    if (!import.meta.client) return;

    const id = normalizeOfferId(overrideOfferId) || resolvedOfferId.value;
    if (!id) return;

    const url = `/go/offer/${encodeURIComponent(id)}`;
    if (target === "_self") {
      window.location.assign(url);
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  };

  return {
    offerId: resolvedOfferId,
    offerUrl,
    openOffer,
  };
}
