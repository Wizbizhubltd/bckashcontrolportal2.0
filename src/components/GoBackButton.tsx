import { ArrowLeftIcon } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Returns to the previous page in the app. When there's no in-app history (a page opened from a
 * bookmark or in a new tab), it goes up one level instead — e.g. /offices/5/edit → /offices/5 —
 * rather than leaving the portal.
 */
export function GoBackButton() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const goBack = () => {
    // React Router numbers each history entry it creates; 0 means this is the first page of the visit.
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) {
      navigate(-1);
      return;
    }
    const parent = pathname.replace(/\/[^/]+\/?$/, '');
    navigate(parent || '/');
  };

  return (
    <button type="button" onClick={goBack} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary mb-4">
      <ArrowLeftIcon size={14} />
      Go Back
    </button>
  );
}
