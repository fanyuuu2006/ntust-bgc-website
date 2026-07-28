import { CSS_VARIABLE_COLORS } from "@/libs/css";
import { User } from "@/types/database";

type UserAvatarProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  user: Pick<User, "id" | "name" | "avatar" | "email">;
};

// 依 user.id 產生穩定 hash，確保同一個使用者每次 render 顏色都一致
function hashString(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function UserAvatar({ user, className, ...rest }: UserAvatarProps) {
  if (!user.avatar) {
    const seed = hashString(user.id ?? user.name);
    const colorIndex1 = seed % CSS_VARIABLE_COLORS.length;
    // 讓第二個顏色與第一個不同，避免漸層失效變成單一色塊
    const colorIndex2 =
      (colorIndex1 + 1 + (seed % (CSS_VARIABLE_COLORS.length - 1))) %
      CSS_VARIABLE_COLORS.length;

    const color1 = CSS_VARIABLE_COLORS[colorIndex1];
    const color2 = CSS_VARIABLE_COLORS[colorIndex2];

    return (
      <svg
        viewBox="0 0 100 100"
        className={className}
        role="img"
        aria-label={user.name}
      >
        <defs>
          <linearGradient
            id={`avatar-gradient-${user.id}`}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor={`var(--game-${color1})`} />
            <stop offset="100%" stopColor={`var(--game-${color2})`} />
          </linearGradient>
        </defs>
        <rect
          width="100"
          height="100"
          fill={`url(#avatar-gradient-${user.id})`}
        />
        <text
          x="50"
          y="50"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="50"
          fontWeight="bold"
          fill="#fff"
          style={{ userSelect: "none" }}
        >
          {user.name.charAt(0)}
        </text>
      </svg>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={user.avatar} alt={user.name} className={className} {...rest} />
  );
}
