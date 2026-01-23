import * as LucideIcons from "lucide-react";

const IconRenderer = ({
  iconSource,
  iconName,
  iconUrl,
  iconUpload,
  size = 20,
  className = "",
}) => {
  if (!iconSource || iconSource === "none") return null;

  if (iconSource === "library" && iconName) {
    const Icon = LucideIcons[iconName];
    if (Icon) {
      return <Icon size={size} className={className} />;
    }
    return (
      <span style={{ fontSize: "12px", color: "#999" }}>Icon not found</span>
    );
  }

  if (iconSource === "url" && iconUrl) {
    return (
      <img
        src={iconUrl}
        alt=""
        style={{ width: size, height: size }}
        className={className}
      />
    );
  }

  if (iconSource === "upload" && iconUpload) {
    return (
      <img
        src={iconUpload}
        alt=""
        style={{ width: size, height: size }}
        className={className}
      />
    );
  }

  return null;
};

export default IconRenderer;
