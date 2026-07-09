import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fileUrl, formatPrice, listingTypeLabel, type ServiceSummary } from '../api/Api';

export const ServiceCard = memo(({ service }: { service: ServiceSummary }) => {
  const navigate = useNavigate();
  return <article
  onClick={() => navigate(`/services/${service.id}`)}
  className="group cursor-pointer overflow-hidden rounded-3xl border border-[var(--line)] bg-white shadow-[0_10px_35px_rgb(23_34_52/0.06)] transition duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_20px_50px_rgb(23_34_52/0.12)]"
>
  <div className="aspect-[4/3] overflow-hidden bg-[#F2F3F5]">
    {(service.image_url || service.images[0]?.url) ? <img loading="lazy" decoding="async"
      src={fileUrl(service.images[0]?.thumbnail_url || service.image_thumbnail_url || service.images[0]?.url || service.image_url)}
      alt={service.title}
      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
    /> : <div className="flex h-full items-center justify-center text-slate-400">Нет фото</div>}
  </div>
  <div className="p-4">
    <div className="flex flex-wrap gap-2">
      <span className="rounded-full bg-[#EEF4FF] px-2.5 py-1 text-xs font-semibold text-[#2F6FED]">{listingTypeLabel(service.listing_type)}</span>
      {service.category && <span className="rounded-full bg-[#F2F3F5] px-2.5 py-1 text-xs text-slate-600">{service.category.name}</span>}
    </div>
    <h3 className="mt-3 line-clamp-2 min-h-12 font-bold leading-6 text-[#1A1A1A] transition-colors group-hover:text-[#2F6FED]">{service.title}</h3>
    <p className="mt-2 text-lg font-black text-[#1A1A1A]">{formatPrice(service)}</p>
    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-[#8A8F99]">
      <span className="truncate">{service.owner.display_name || service.owner.username}</span>
      <span className="truncate pl-3">{service.location || 'Якутск'}</span>
    </div>
  </div>
</article>;
});
