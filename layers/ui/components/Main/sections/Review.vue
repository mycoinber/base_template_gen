<script setup>
import { resolveMediaPath } from '#layers/base/utils/mediaPath';

const props = defineProps({
  block: {
    type: Object,
    default: () => ({}),
  },
});

const placeholderAvatar = '/avatar-placeholder.svg';

const toTrimmedString = (value) => (typeof value === 'string' ? value.trim() : '');

const isMediaPath = (value) =>
  typeof value === 'string' && (value.startsWith('/') || value.startsWith('http://') || value.startsWith('https://'));

const resolveAvatar = (review) => {
  const candidates = [
    Array.isArray(review?.author?.picture) ? review.author.picture[0]?.path : null,
    review?.author?.picture?.path,
    review?.authorAvatarMedia?.path,
    review?.authorAvatar?.path,
    review?.author?.avatar?.path,
    typeof review?.author?.avatar === 'string' ? review.author.avatar : null,
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (isMediaPath(candidate)) {
      return resolveMediaPath(candidate);
    }
  }

  return placeholderAvatar;
};

const resolveAuthorName = (review, index) => {
  const directName = toTrimmedString(review?.name);
  if (directName) return directName;

  const authorBio = toTrimmedString(review?.authorBio);
  if (authorBio) return authorBio;

  if (typeof review?.author === 'string') {
    const authorAsString = toTrimmedString(review.author);
    if (authorAsString) return authorAsString;
  }

  const author = review?.author && typeof review.author === 'object' ? review.author : null;
  const firstName = toTrimmedString(author?.name);
  const lastName = toTrimmedString(author?.surname || author?.lastName || author?.last);
  const nickname = toTrimmedString(author?.nickname);
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  return fullName || nickname || `Reviewer ${index + 1}`;
};

const formatDate = (raw) => {
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '';
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${day}.${month}.${year}`;
};
</script>

<template>
  <section :id="block._id" v-if="block?.reviews?.length" class="my-8 max-[541px]:my-4">
    <div class="container">
      <div class="flex flex-col gap-4 overflow-hidden max-[541px]:gap-0">
        <h2>{{ block?.headline || block?.H2 }}</h2>
        <div class="grid grid-cols-4 gap-8 max-[541px]:flex max-[541px]:gap-4 max-[541px]:min-w-full max-[541px]:w-full max-[541px]:overflow-y-hidden max-[541px]:overflow-x-scroll max-[541px]:py-4">
          <div
            v-for="(review, index) in block?.reviews"
            :key="review._id || index"
            class="flex flex-col gap-2 p-4 rounded-[0.625rem] bg-background-02 w-full max-[541px]:w-80 max-[541px]:min-w-80"
            style="border: 1px solid var(--border);"
            itemscope
            itemtype="http://schema.org/Review"
          >
            <div class="flex gap-4">
              <div class="w-20 h-20 rounded-full overflow-hidden" style="border: 1px solid var(--border);">
                <NuxtImg
                  :src="resolveAvatar(review)"
                  alt="author"
                  itemprop="image"
                  sizes="80px"
                  class="w-full h-full object-cover"
                />
              </div>

              <div class="flex flex-col flex-1">
                <span v-if="formatDate(review.date)" class="text-sm opacity-50 w-full text-right" itemprop="datePublished">
                  {{ formatDate(review.date) }}
                </span>

                <span class="font-font-02 text-[1.35rem] font-bold" itemprop="author">
                  {{ resolveAuthorName(review, index) }}
                </span>
              </div>
            </div>

            <div class="flex items-center gap-1" itemprop="reviewRating" itemscope itemtype="http://schema.org/Rating">
              <Icon name="material-symbols:star-rounded" style="color: #ffb800" />
              <span class="text-sm" itemprop="ratingValue"> {{ review.rating }}/5 </span>
            </div>

            <div
              class="text-sm opacity-50"
              itemprop="reviewBody"
              v-html="review.comment || review.content"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
