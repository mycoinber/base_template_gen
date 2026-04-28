<script setup>
import { computed } from 'vue';

const props = defineProps({
    data: {
        type: Object,
        default: () => ({}),
    },
});

// Prefer offer.link (via composable) if offerId is provided or available globally, fallback to provided link
const explicitOfferId = computed(() => props.data?.offerId || props.data?.offer?._id)
const globalOfferId = useState('currentOfferId', () => null)
const offerId = computed(() => explicitOfferId.value || globalOfferId.value)
const { offer } = useOffer(offerId)
// If explicit link is provided, respect it; otherwise use offer.link when available
const resolvedLink = computed(() => props.data?.link ? props.data.link : (offer.value?.link || ''))
</script>

<template>
    <NuxtLink v-if="resolvedLink" :to="resolvedLink" class="eagle-cta-muted font-font-01 text-sm text-center w-fit min-w-32 px-5 py-3.5 no-underline" :target="data.target || '_self'" :rel="data.rel || ''">
        {{ data.title }}
    </NuxtLink>
    <button v-else type="button" class="eagle-cta-muted font-font-01 text-sm text-center w-fit min-w-32 px-5 py-3.5">
        {{ data.title }}
    </button>
</template>
