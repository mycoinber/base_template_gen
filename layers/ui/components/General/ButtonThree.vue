<script setup>
import { computed } from 'vue';

const props = defineProps({
    data: {
        type: Object,
        default: () => ({}),
    },
});

const explicitOfferId = computed(() => props.data?.offerId || props.data?.offer?._id || props.data?.offer?.id)
const globalOfferId = useState('currentOfferId', () => null)
const offerId = computed(() => explicitOfferId.value || (!props.data?.link ? globalOfferId.value : null))
const { openOffer } = useOfferNavigation(offerId)
const resolvedLink = computed(() => props.data?.link || '')
const isOfferAction = computed(() => Boolean(offerId.value))
</script>

<template>
    <button v-if="isOfferAction" type="button" class="eagle-cta-gold font-font-01 text-sm text-center w-fit min-w-32 px-5 py-3.5 no-underline" @click="openOffer(null, data.target || '_blank')">
        {{ data.title }}
    </button>
    <NuxtLink v-else-if="resolvedLink" :to="resolvedLink" class="eagle-cta-gold font-font-01 text-sm text-center w-fit min-w-32 px-5 py-3.5 no-underline" :target="data.target || '_self'" :rel="data.rel || ''">
        {{ data.title }}
    </NuxtLink>
    <button v-else type="button" class="eagle-cta-gold font-font-01 text-sm text-center w-fit min-w-32 px-5 py-3.5">
        {{ data.title }}
    </button>
</template>
