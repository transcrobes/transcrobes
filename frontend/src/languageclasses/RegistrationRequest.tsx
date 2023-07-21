import EmailIcon from "@mui/icons-material/Email";
import { Box } from "@mui/material";
import _ from "lodash";
import { Button, useNotify, useRecordContext, useTranslate } from "react-admin";
import { FormContainer, TextFieldElement, useForm } from "react-hook-form-mui";
import { ClassRegistrationRequest } from "../lib/types";
import { platformHelper } from "../app/createStore";

export default function RegistrationRequest({ tipe }: { tipe: "student" | "teacher" }) {
  const translate = useTranslate();
  const klass = useRecordContext();
  const notify = useNotify();
  const formContext = useForm({
    defaultValues: {
      email: "",
    },
  });

  async function handleSubmit(data: { email: string }) {
    const registrations = [
      {
        email: data.email,
        class_id: klass.id,
        is_teacher: tipe === "teacher",
      },
    ] as ClassRegistrationRequest[];
    await platformHelper.enqueueRegistrations({ registrations });
    formContext.reset();
    notify(`widgets.class_registration.request_sent`, { type: "info", messageArgs: { tipe: _.capitalize(tipe) } });
  }

  return (
    <FormContainer formContext={formContext} onSuccess={handleSubmit}>
      <Box sx={{ display: "flex", padding: "1em", gap: "1em" }}>
        <Button
          type="submit"
          variant="text"
          color="primary"
          label={translate(`widgets.class_registration.button`, { tipe: tipe })}
          children={<EmailIcon />}
        />
        <TextFieldElement
          sx={{ minWidth: "10em" }}
          helperText={translate(`widgets.class_registration.helper`, { tipe: tipe })}
          name="email"
          type="email"
          label={translate("user.email")}
          required
        />
      </Box>
    </FormContainer>
  );
}
