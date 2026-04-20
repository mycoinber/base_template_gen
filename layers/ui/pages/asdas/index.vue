<template>
  <main>
    <Main :data="data" />
  </main>
</template>

<script setup>
import { useNuxtApp } from "#app";
import { useRequestURL } from "#app";
import { useI18n } from 'vue-i18n';
const { locale } = useI18n();

const url = useRequestURL();
const siteDomain = `${url.protocol}//${url.host}`;

const { $axios } = useNuxtApp();
const config = useRuntimeConfig();
const siteId = import.meta.server
  ? config.server.siteId
  : config.public.siteId;
const route = useRoute();

const slug = route.params.slug;


const fetchPage = async (siteId, slug = null) => {
  const params = { siteId };
  if (slug) params.slug = slug;
  try {
    const response = await $axios.get("/pages/page-by-slug", { params });
    return response.data;
  } catch (error) {
    return {}; // Возвращаем пустой объект в случае ошибки
  }
};

const { data, status, error, refresh, clear } = await useAsyncData(
  `page-${slug}-${siteId}`,
  () => fetchPage(siteId, slug),
  {
    server: true,

  }
);


const globalHeadRaw = import.meta.server
  ? config.server.globalHead
  : config.public.globalHead;
const globalHead = {
  link: globalHeadRaw
    .filter((tag) => tag.startsWith("<link"))
    .map((tag) => {
      const attributes = Array.from(tag.matchAll(/(\w+)=["'](.*?)["']/g));
      return Object.fromEntries(
        attributes.map(([_, name, value]) => [name, value])
      );
    }),
  meta: globalHeadRaw
    .filter((tag) => tag.startsWith("<meta"))
    .map((tag) => {
      const attributes = Array.from(tag.matchAll(/(\w+)=["'](.*?)["']/g));
      return Object.fromEntries(
        attributes.map(([_, name, value]) => [name, value])
      );
    }),
};

if (data.value && Object.keys(data.value).length > 0) {
  const pageHead = data.value.head || {};
  const domain = data.value.domain || siteDomain;

  locale.value = data.value.lang || "en";

  useHead({
    htmlAttrs: {
      lang: data.value.lang || "en",
    },
    title:
      pageHead.title || "Website",
    meta: [
      { name: "description", content: pageHead.description },
      { name: "keywords", content: pageHead.keywords },
      // {
      //   name: "robots",
      //   content:
      //     data.value.robots?.metaTags?.[0]?.content ||
      //     pageHead.robots ||
      //     "index, follow",
      // },
      { property: "og:title", content: pageHead.title },
      { property: "og:description", content: pageHead.description },
      {
        property: "og:image",
        content: data.value.article?.introImage?.[0]?.path,
      },
      {
        property: "og:url",
        content: `${domain}/${data.value.slug}`,
      },
      { property: "og:type", content: "article" },
      { property: "og:locale", content: data.value.lang || "en" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: pageHead.title },
      { name: "twitter:description", content: pageHead.description },
      {
        name: "twitter:image",
        content: data.value.article?.introImage?.[0]?.path,
      },
    ],
    link: [{ rel: "canonical", href: `${domain}/` }],

  });

  useHead({
      link: [{
        rel: "alternate",
        hreflang: data.value.lang || "en",
        href: `${siteDomain}/`,
      },
    ],
  });

  if (data.value.alters && Array.isArray(data.value.alters)) {
    useHead({
      link: data.value.alters.map(alter => ({
        rel: "alternate",
        hreflang: alter.hreflang,
        href: `${siteDomain}/${alter.slug}`
      }))
    });
  }

  if (data.value.robots?.metaTags) {
    useHead({
      meta: data.value.robots.metaTags.map(tag => ({
        name: tag.name,
        content: tag.content
      }))
    });
  }

  useHead({
    meta: globalHead.meta,
    link: globalHead.link,
  });

  // if (data.value.ldJson && Array.isArray(data.value.ldJson)) {
  //   useSchemaOrg(
  //     data.value.ldJson.map((item) => {
  //       switch (item["@type"]) {
  //         case "Article":
  //           return defineArticle({
  //             headline: item.headline,
  //             description: item.description,
  //             datePublished: item.datePublished || data.value.createdAt,
  //             dateModified: item.dateModified || data.value.updatedAt,
  //             author: {
  //               "@type": "Person",
  //               name:
  //                 item.author?.name ||
  //                 data.value.aiauthor?.name ||
  //                 "Example Author",
  //             },
  //             publisher: {
  //               "@type": "Organization",
  //               name: item.publisher?.name || "Example Site",
  //               logo: item.publisher?.logo || {
  //                 "@type": "ImageObject",
  //                 url: "https://example.com/logo.png",
  //               },
  //             },
  //             mainEntityOfPage: {
  //               "@type": "WebPage",
  //               "@id":
  //                 item.mainEntityOfPage?.["@id"] ||
  //                 `${domain}/${data.value.slug}`,
  //             },
  //             wordCount: item.wordCount || data.value.article?.word_count,
  //             inLanguage: item.inLanguage || "en",
  //             image: data.value.article?.introImage?.[0]?.path || item.image,
  //           });

  //         case "BreadcrumbList":
  //           return defineBreadcrumb({
  //             itemListElement: item.itemListElement.map(
  //               (breadcrumb, index) => ({
  //                 "@type": "ListItem",
  //                 position: breadcrumb.position || index + 1,
  //                 name: breadcrumb.name,
  //                 item: breadcrumb.item,
  //               })
  //             ),
  //           });

  //         case "FAQPage":
  //           return {
  //             "@type": "FAQPage",
  //             mainEntity: item.mainEntity.map((faq) => ({
  //               "@type": "Question",
  //               name: faq.name,
  //               acceptedAnswer: {
  //                 "@type": "Answer",
  //                 text: faq.acceptedAnswer.text,
  //               },
  //             })),
  //           };

  //         case "Review":
  //           return {
  //             "@type": "Review",
  //             itemReviewed: {
  //               "@type": "CreativeWork",
  //               name: item.itemReviewed?.name || "Sweet Bonanza Oyunu Oyna",
  //             },
  //             reviewRating: {
  //               "@type": "Rating",
  //               ratingValue: item.reviewRating?.ratingValue || 5,
  //               bestRating: item.reviewRating?.bestRating || 5,
  //             },
  //             author: {
  //               "@type": "Person",
  //               name: item.author?.name,
  //             },
  //             reviewBody: item.reviewBody,
  //             datePublished: item.datePublished || data.value.createdAt,
  //           };

  //         default:
  //           return item;
  //       }
  //     })
  //   );
  // } else {
  
  //   useSchemaOrg([
  //     defineWebPage({
  //       name: pageHead.title || "Sweet Bonanza Oyunu Oyna",
  //       url: `${domain}/${data.value.slug}`,
  //     }),
  //   ]);
  // }

  if (Array.isArray(data.value.pixel) && data.value.pixel.length > 0) {
    useHead({
      script: [
        {
          innerHTML: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            ${data.value.pixel
              .map((pixelId) => `fbq('init', '${pixelId}');`)
              .join('\n')}
            fbq('track', 'PageView');
          `,
        },
      ],
      noscript: data.value.pixel.map((pixelId) => ({
        innerHTML: `
          <img height="1" width="1" style="display:none"
          src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"/>
        `,
      })),
    });
  }

  // Добавление Google Tag Manager для массива ID
  if (Array.isArray(data.value.gtm) && data.value.gtm.length > 0) {
    useHead({
      script: data.value.gtm.map((gtmId, index) => ({
        key: `gtm-script-${index}`,
        innerHTML: `
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${gtmId}');
        `,
      })),
      noscript: data.value.gtm.map((gtmId, index) => ({
        key: `gtm-noscript-${index}`,
        innerHTML: `
          <iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}"
          height="0" width="0" style="display:none;visibility:hidden"></iframe>
        `,
      })),
    });
  }
}
</script>
