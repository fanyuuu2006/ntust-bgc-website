import type { BoardGame } from "@/types/database";

type BoardGameImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  boardGame: Pick<BoardGame, "id" | "name" | "image">;
};

export function BoardGameImage({
  boardGame,
  className,
  ...rest
}: BoardGameImageProps) {
  if (!boardGame.image) {
    return (
      <svg
        viewBox="0 0 100 100"
        className={className}
        role="img"
        aria-label={`${boardGame.name}尚無圖片`}
      >
        <rect width="100" height="100" fill="#00000088" />
        <text
          x="50"
          y="50"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="16"
          fontWeight="500"
          fill="#fff"
          style={{ userSelect: "none" }}
        >
          無圖片
        </text>
      </svg>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={boardGame.image}
      alt={boardGame.name}
      className={className}
      {...rest}
    />
  );
}
