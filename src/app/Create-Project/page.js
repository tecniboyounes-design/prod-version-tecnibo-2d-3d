"use client"; 

import CircularWithValueLabel from "@/components/Otman/UI/CircularWithValueLabel";
import dynamic from "next/dynamic";
import { Suspense, useEffect } from "react";
import { useSelector } from "react-redux";

const NewProject = dynamic(() => import("@/components/Otman/UI/NewProject"), {
  ssr: false,
  loading: () => <CircularWithValueLabel />, 
});

const Page = () => {
   
  return (
    <Suspense fallback={<CircularWithValueLabel />}>
      <NewProject />
    </Suspense>
  );
};

export default Page;
