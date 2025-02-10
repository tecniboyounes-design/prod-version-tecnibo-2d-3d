"use client"

import { useRouter } from 'next/router';

const ProtectedRoute = ({ children, isAdmin }) => {
    const router = useRouter();

    const { loading, isAuthenticated, user } = useSelector(state => state.jsonData.user);
    console.log(loading, isAuthenticated, user);
    
    return (
        <>
            {loading === false && (
                isAuthenticated === false ?  router.push('/signin') : isAdmin ? user.role !== "admin" ?  router.push('/signin') : children : children
            )}
        </>
    );
};

export default ProtectedRoute;

