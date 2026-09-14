import { useEffect } from "react";

/**
 * usePageMeta — sets <title> and meta description for the current page.
 * @param {string} title    - Page title (without " | SafeArchive" suffix)
 * @param {string} [description] - Optional meta description
 */
const usePageMeta = (title, description) => {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title
      ? `${title} | SafeArchive`
      : "SafeArchive - Secure Cloud-Backed Version Control";

    let metaDesc = document.querySelector(`meta[name="description"]`);
    const prevDesc = metaDesc ? metaDesc.getAttribute("content") : "";
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    if (description) metaDesc.setAttribute("content", description);

    return () => {
      document.title = prevTitle;
      if (metaDesc && prevDesc) metaDesc.setAttribute("content", prevDesc);
    };
  }, [title, description]);
};

export default usePageMeta;
