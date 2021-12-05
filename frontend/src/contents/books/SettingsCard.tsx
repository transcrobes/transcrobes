// FIXME: copy/pasted and modified from @nypl/web-reader as there
// is currently no method for adding/overriding the integrated SettingsCard
import * as React from "react";
import { Popover, PopoverTrigger, PopoverContent, PopoverBody, Text, Icon } from "@chakra-ui/react";
import { MdOutlineSettings, MdOutlineCancel } from "react-icons/md";

import Button from "./Button";

// import useColorModeValue from "./hooks/useColorModeValue";
import GlossingSettings from "./GlossingSettings";
import { MouseoverType, SegmentationType } from "../../lib/types";

type SettingsCardProps = {
  glossing: string;
  setGlossing: (glossing: string) => void;
  segmentation: string;
  setSegmentation: (segmentation: SegmentationType) => void;
  mouseover: string;
  setMouseover: (mouseover: MouseoverType) => void;
};
export default function SettingsCard(props: SettingsCardProps): React.ReactElement {
  const [isOpen, setIsOpen] = React.useState(false);
  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  return (
    <>
      <Popover placement="bottom" isOpen={isOpen} onOpen={open} onClose={close} autoFocus={true}>
        <PopoverTrigger>
          <Button
            onClick={open}
            border="none"
            leftIcon={<Icon as={isOpen ? MdOutlineCancel : MdOutlineSettings} w={6} h={6} />}
          >
            <Text variant="headerNav">Glossing</Text>
          </Button>
        </PopoverTrigger>
        {/* <PopoverContent borderColor="gray.100" width="fit-content" bgColor={contentBgColor}> */}
        <PopoverContent borderColor="gray.100" width="fit-content">
          <PopoverBody p={0} maxWidth="95vw">
            <GlossingSettings
              glossing={props.glossing}
              setGlossing={props.setGlossing}
              segmentation={props.segmentation}
              setSegmentation={props.setSegmentation}
              mouseover={props.mouseover}
              setMouseover={props.setMouseover}
            />
          </PopoverBody>
        </PopoverContent>
      </Popover>
    </>
  );
}
