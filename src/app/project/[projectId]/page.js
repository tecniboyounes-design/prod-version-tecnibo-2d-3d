"use client";

import CircularWithValueLabel from "@/components/Otman/UI/CircularWithValueLabel";
import dynamic from "next/dynamic";

const NewProject = dynamic(() => import("@/components/Otman/UI/NewProject"), {
  ssr: false,
  loading: () => <CircularWithValueLabel />, 
});

const Page = () => {
  return (
      <NewProject />
  );
};

export default Page;
