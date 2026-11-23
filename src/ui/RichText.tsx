import type { TextSegment } from "../core/tokens.ts";

/** RF-25: texto táctico con cada unidad, edificio o tecnología resaltada con su nombre oficial. */
export function RichText({ segments }: { segments: TextSegment[] }) {
  return (
    <>
      {segments.map((segment, i) =>
        segment.kind === "text" ? (
          segment.text
        ) : (
          <strong key={i} class="entity" data-ref={segment.ref}>
            {segment.name}
          </strong>
        ),
      )}
    </>
  );
}
