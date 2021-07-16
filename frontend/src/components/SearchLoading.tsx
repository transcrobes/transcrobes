import styled from "styled-components";
import Loader from "../img/loader.gif";

interface Props {
  Img: string;
}

const SearchLoading = styled.img.attrs<Props>((props) => ({
  src: props.Img || Loader,
}))`
  position: fixed;
  left: 0;
  right: 0;
  margin: auto;
  display: block;
`;
export default SearchLoading;
