export function TitleText({ text }: { text: string }) {
  const parts = text.split(/(「[^」]*」)/g);
  return (
    <>
      {parts.map((part, index) =>
        /^「.*」$/.test(part) ? (
          <span key={index} className="whitespace-nowrap">
            {part}
          </span>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  );
}
