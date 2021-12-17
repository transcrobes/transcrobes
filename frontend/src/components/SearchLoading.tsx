import { CircularProgress, styled } from "@material-ui/core";
import { Property } from "csstype";

const SearchLoading = styled(
  ({ size, disableShrink }: { size?: Property.FontSize; disableShrink?: boolean }) => {
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
