import { CircularProgress, styled } from "@material-ui/core";
import { FontSizeProperty } from "csstype";

const SearchLoading = styled(
  ({
    size,
    disableShrink,
  }: {
    size?: FontSizeProperty<string | number>;
    disableShrink?: boolean;
  }) => {
    return (
      <div>
        <CircularProgress size={size || 200} disableShrink={disableShrink} />
      </div>
    );
  },
)({
  textAlign: "center",
  display: "block",
});

export default SearchLoading;
