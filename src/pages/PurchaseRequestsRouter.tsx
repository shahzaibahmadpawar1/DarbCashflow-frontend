import { useAuth } from '../hooks/useAuth';
import { OfficePurchaseRequests } from './OfficePurchaseRequests';
import { StationPurchaseRequestsPage } from './StationPurchaseRequestsPage';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';

export const PurchaseRequestsRouter = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return <LoadingSpinner />;
    }

    // Station Manager sees their own station's requests
    if (user?.role === 'SM') {
        return <StationPurchaseRequestsPage />;
    }

    // Office users, admins, accountants see all requests
    return <OfficePurchaseRequests />;
};
