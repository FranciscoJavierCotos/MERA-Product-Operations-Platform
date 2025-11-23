import React from "react";

/**
 * Highlights search terms in text by wrapping them with a mark element
 * @param text - The text to highlight
 * @param searchQuery - The search query to highlight
 * @returns JSX element with highlighted terms
 */
export function highlightText(
  text: string,
  searchQuery: string
): React.ReactNode {
  if (!searchQuery || !text) return text;

  // Remove quotes from search query for highlighting
  const cleanQuery = searchQuery.replace(/["']/g, "").trim();

  if (!cleanQuery) return text;

  // Split by spaces to get individual search terms
  const searchTerms = cleanQuery.split(/\s+/).filter((term) => term.length > 0);

  // Create a regex pattern that matches any of the search terms (case-insensitive)
  const pattern = searchTerms
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const regex = new RegExp(`(${pattern})`, "gi");

  // Split text by the regex pattern, keeping the matched parts
  const parts = text.split(regex);

  return parts.map((part, index) => {
    // Check if this part matches any search term
    const isMatch = searchTerms.some(
      (term) => part.toLowerCase() === term.toLowerCase()
    );

    if (isMatch) {
      return (
        <mark key={index} className="bg-yellow-200 font-normal px-0.5 rounded">
          {part}
        </mark>
      );
    }
    return <span key={index}>{part}</span>;
  });
}
