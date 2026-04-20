import { computed, unref, type Ref } from 'vue'
import type { AxiosInstance } from 'axios'
import { useQuery } from '@tanstack/vue-query'

type MaybeRef<T> = T | Ref<T>

export function useOffer(offerId: MaybeRef<string | null | undefined>) {
  const nuxtApp = useNuxtApp()
  const $axios = nuxtApp.$axios as AxiosInstance

  const enabled = computed(() => Boolean(unref(offerId)) && import.meta.client)

  const fetchOffer = async () => {
    const id = unref(offerId)
    if (!id) return null
    const response = await $axios.get(`/public/offer/${id}`)
    return response.data
  }

  const query = useQuery({
    queryKey: computed(() => ['offer', unref(offerId) || null]),
    queryFn: fetchOffer,
    enabled,
  })

  return {
    offer: query.data,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
