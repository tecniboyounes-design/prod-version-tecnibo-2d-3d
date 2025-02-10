"use client"; 

import dynamic from "next/dynamic";
import { Suspense } from "react";

const NewProject = dynamic(() => import("@/components/Otman/UI/NewProject"), {
  ssr: false,
  loading: () => <div>Loading...</div>, 
});

const Page = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewProject />
    </Suspense>
  );
};

export default Page;
