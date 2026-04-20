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
    <NuxtLink v-if="resolvedLink" :to="resolvedLink" class="font-font-02 text-base font-medium text-color-white text-center uppercase w-full min-w-0 px-6 py-4 rounded-[0.4rem] relative z-10 overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-full before:bg-color-01 before:z-[-1] before:transition-[filter] before:duration-300 hover:before:brightness-[0.7]" :target="data.target || '_self'" :rel="data.rel || ''">
        {{ data.title }}
    </NuxtLink>
    <button v-else type="button" class="font-font-02 text-base font-medium text-color-white text-center uppercase w-full min-w-0 px-6 py-4 rounded-[0.4rem] relative z-10 overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-full before:bg-color-01 before:z-[-1] before:transition-[filter] before:duration-300 hover:before:brightness-[0.7]">
        {{ data.title }}
    </button>
    
</template>
