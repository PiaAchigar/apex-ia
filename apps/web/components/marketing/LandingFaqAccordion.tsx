"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

type FaqItem = {
  question: string;
  answer: string;
};

type LandingFaqAccordionProps = {
  items: FaqItem[];
};

export function LandingFaqAccordion({ items }: LandingFaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-3" role="list">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        const panelId = `faq-panel-${index}`;
        const buttonId = `faq-button-${index}`;

        return (
          <div
            key={item.question}
            role="listitem"
            className={`glass rounded-xl overflow-hidden transition-all duration-200 ${
              isOpen ? "border-emerald-500/40" : "hover:border-[#4B5563]"
            }`}
          >
            <button
              id={buttonId}
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="w-full flex items-center justify-between px-6 py-5 text-left cursor-pointer group"
            >
              <span className="font-medium text-gray-200 group-hover:text-white transition-colors duration-200 pr-4">
                {item.question}
              </span>
              <ChevronDown
                className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-all duration-300 ${
                  isOpen ? "rotate-180 text-emerald-400" : ""
                }`}
                aria-hidden="true"
              />
            </button>

            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className={`overflow-hidden transition-all duration-300 ${
                isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="px-6 pb-5 text-gray-400 leading-relaxed border-t border-[#374151] pt-4">
                {item.answer}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
