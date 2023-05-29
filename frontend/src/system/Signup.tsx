import AddIcon from "@mui/icons-material/Add";
import { Avatar, Box, Button, Card, CardActions, CircularProgress, Typography } from "@mui/material";
import { ReactElement, useEffect, useState } from "react";
import { Notification, useNotify, useTranslate } from "react-admin";
import { CheckboxElement, FormContainer, SelectElement, TextFieldElement } from "react-hook-form-mui";
import { Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import PasswordStrengthBar from "../components/PasswordStrengthBar";
import WatchDemo from "../components/WatchDemo";
import { setLoading } from "../features/ui/uiSlice";
import { DOCS_DOMAIN, LOCALES, SIGNUP_YT_VIDEO } from "../lib/types";

const stdPadding = { padding: "0 1em 1em 1em" };
const stdMargin = { marginTop: "1em" };
type OptionType = { id: string; label: string };

const emailRegex =
  /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;

function emailIsValid(email: string) {
  return emailRegex.test(email);
}

interface FormValues {
  email?: string;
  password?: string;
  langPair?: string;
  repeatPassword?: string;
  consent?: boolean;
}

export default function Signup(): ReactElement {
  const [creationSent, setCreationSent] = useState(false);
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [passwordScore, setPasswordScore] = useState(0);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [emailValid, setEmailValid] = useState(false);
  const [availableLangPairs, setAvailableLangPairs] = useState<OptionType[]>();

  const loading = useAppSelector((state) => state.ui.loading);
  const dispatch = useAppDispatch();
  const translate = useTranslate();
  const notify = useNotify();

  function handleSubmit(form: FormValues) {
    dispatch(setLoading(true));
    const newUser = {
      email: form.email,
      username: form.email,
      password: form.password,
      from_lang: form.langPair?.split(":")[0],
      to_lang: form.langPair?.split(":")[1],
    };
    fetch(`${location.origin}/api/v1/users/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newUser),
    })
      .then((res) => {
        if (res.ok) {
          notify("user.signup.email_success", { type: "success" });
          setCreationSent(true);
        } else {
          throw new Error("Error creating the user.");
        }
      })
      .catch((error: Error) => {
        dispatch(setLoading(false));
        notify(
          typeof error === "string"
            ? error
            : typeof error === "undefined" || !error.message
            ? "user.signup.error"
            : error.message,
          { type: "warning" },
        );
      });
  }

  useEffect(() => {
    fetch(`${location.origin}/api/v1/data/langs`, {
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        if (res.ok) {
          return res.json();
        } else {
          throw new Error("Error getting the available langs.");
        }
      })
      .catch((error: Error) => {
        dispatch(setLoading(false));
        notify(
          typeof error === "string"
            ? error
            : typeof error === "undefined" || !error.message
            ? "user.signup.error"
            : error.message,
          { type: "warning" },
        );
      })
      .then((data: string[]) => {
        const newLocales: OptionType[] = [];
        for (const langPair of data) {
          const val: OptionType = {
            id: langPair,
            label: LOCALES.find((a) => a.locale === langPair.split(":")[0])?.name || "",
          };
          newLocales.push(val);
        }
        setAvailableLangPairs(newLocales);
      });
  }, []);

  const helpUrl = `//${DOCS_DOMAIN}`;

  return (
    <FormContainer defaultValues={{ email: "", langPair: "en:zh-Hans" }} onSuccess={handleSubmit}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "flex-start",
          background: "url(https://source.unsplash.com/random/1600x900/?china)",
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
        }}
      >
        <Card sx={{ minWidth: 300, marginTop: "6em" }}>
          <Box sx={{ margin: "1em", display: "flex", alignItems: "center", justifyContent: "space-around" }}>
            <Avatar sx={{ backgroundColor: "secondary.main" }}>
              <AddIcon />
            </Avatar>
            <WatchDemo url={SIGNUP_YT_VIDEO} size="large" />
          </Box>
          {!creationSent ? (
            <>
              <Box sx={{ ...stdPadding, ...stdMargin }}>
                <SelectElement
                  fullWidth
                  disabled={loading}
                  name="langPair"
                  label={translate("screens.signup.learn")}
                  required
                  options={availableLangPairs}
                />
              </Box>
              <Box sx={{ ...stdPadding, ...stdMargin }}>
                <TextFieldElement
                  fullWidth
                  onChange={(e) => setEmailValid(emailIsValid(e.target.value))}
                  disabled={loading}
                  name="email"
                  label={translate("user.email")}
                  type="email"
                  required
                />
              </Box>
              <Box sx={{ ...stdPadding, ...stdMargin }}>
                <TextFieldElement
                  fullWidth
                  disabled={loading}
                  onChange={(e) => {
                    setPassword(e.target.value);
                  }}
                  name="password"
                  label={translate("ra.auth.password")}
                  type="password"
                  required
                />
              </Box>
              <Box sx={{ ...stdPadding, ...stdMargin }}>
                <PasswordStrengthBar
                  minLength={8}
                  onChangeScore={(score) => setPasswordScore(score)}
                  password={password}
                />
              </Box>
              <Box sx={{ ...stdPadding, ...stdMargin }}>
                <TextFieldElement
                  fullWidth
                  disabled={loading}
                  name="repeatPassword"
                  error={password !== repeatPassword}
                  helperText={password !== repeatPassword ? translate("user.reset_password.passwords_different") : ""}
                  onChange={(e) => {
                    setRepeatPassword(e.target.value);
                  }}
                  label={translate("user.reset_password.repeat_password")}
                  type="password"
                  required
                />
              </Box>
              <Box sx={{ ...stdPadding, ...stdMargin }}>
                <Typography>
                  <label>
                    {translate("user.signup.consent_a")}{" "}
                    <a href="/static/consent.html" target="_blank">
                      {translate("user.signup.consent_b")}
                    </a>
                  </label>
                </Typography>
                <CheckboxElement
                  onChange={(e) => {
                    setAcceptedTerms(e.target.checked);
                  }}
                  name="consent"
                  required
                />
              </Box>
              <CardActions sx={stdPadding}>
                <Button
                  variant="contained"
                  type="submit"
                  color="primary"
                  disabled={
                    loading || passwordScore < 3 || password !== repeatPassword || !acceptedTerms || !emailValid
                  }
                  fullWidth
                >
                  {loading && <CircularProgress size={25} thickness={2} />}
                  {translate("user.signup.label")}
                </Button>
              </CardActions>
            </>
          ) : (
            <Box sx={stdPadding}>
              <Typography>{translate("user.signup.email_success_long")}</Typography>
            </Box>
          )}

          <div>
            <Box sx={stdPadding}>
              <Typography>
                <Link to="/login">{translate("ra.auth.sign_in")}</Link>
              </Typography>
            </Box>
            <Box sx={stdPadding}>
              <Typography>
                <Link to="/recover-password">{translate("user.reset_password.label")}</Link>
              </Typography>
            </Box>
            <Box sx={stdPadding}>
              <Typography>
                <a target={"_blank"} href={helpUrl}>
                  {translate("user.help.site")}
                </a>
              </Typography>
            </Box>
          </div>
        </Card>
        <Notification />
      </Box>
    </FormContainer>
  );
}
