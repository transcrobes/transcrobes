const TranscrobesCSS = `
/* error customisation */
.form-error {
    color: red;
    font-weight: bold;
}

/* black theme */
.black {
	background: #000;
  color: #fff;
  fill: #fff;
}

/* dark theme */
.dark {
  background-color: #121212;
  color: #fff;
  opacity: 0.7;
  fill: #fff;
}
.dark a:link {
  color: #659EC7;
}

/* light theme, currently the same as white */
.light {
	background: #fff;
	color: #000;
  fill: #000;
}

/* white theme */
.white {
	background: #fff;
	color: #000;
  fill: #000;
}

.loader {
  border: 5px solid #f3f3f3;
  border-radius: 50%;
  border-top: 5px solid #000;
  align-content: center;
  width: 32px;
  height: 32px;
  animation: spin 2s linear infinite;
}
.centre-loader {
  margin: auto;
  left: 50%;
  background-color: white;
  transform: translateX(-50%);
  width: 50px;
  z-index: 10000;
  top: 20px;
  position: fixed;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.hidden {
  display: none!important;
}

`;

export default TranscrobesCSS;
