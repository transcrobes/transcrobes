import {
  LabelDisplayedRowsArgs,
  TablePagination,
  TablePaginationBaseProps,
  Theme,
  Toolbar,
  useMediaQuery,
} from "@mui/material";
import { sanitizeListRestProps, useListPaginationContext, useTranslate } from "ra-core";
import * as React from "react";
import { ReactElement, useCallback, useMemo } from "react";

const emptyArray: any[] = [];

function Pagination(props: PaginationProps): ReactElement {
  const { rowsPerPageOptions = [5], forceSmall, limit, ...rest } = props;
  const { isLoading, page, perPage, total, setPage, setPerPage } = useListPaginationContext(props);
  const translate = useTranslate();
  const isSmall = useMediaQuery((theme: Theme) => theme.breakpoints.down("md"));

  const totalPages = useMemo(() => {
    return Math.ceil(total / perPage) || 1;
  }, [perPage, total]);

  /**
   * Warning: material-ui's page is 0-based
   */
  const handlePageChange = useCallback(
    (event: React.MouseEvent<HTMLButtonElement, MouseEvent> | null, page: number) => {
      event && event.stopPropagation();
      if (page < 0 || page > totalPages - 1) {
        throw new Error(
          translate("ra.navigation.page_out_of_boundaries", {
            page: page + 1,
          }),
        );
      }
      setPage(page + 1);
    },
    [totalPages, setPage, translate],
  );

  const handlePerPageChange: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement> = useCallback(
    (event) => {
      setPerPage(parseInt(event.target.value));
    },
    [setPerPage],
  );

  const labelDisplayedRows = useCallback(
    ({ from, to, count }: LabelDisplayedRowsArgs) =>
      translate("ra.navigation.page_range_info", {
        offsetBegin: from,
        offsetEnd: to,
        total: count,
      }),
    [translate],
  );

  // Avoid rendering TablePagination if "page" value is invalid
  if (total === null || total === 0 || page < 1 || page > totalPages) {
    return isLoading ? <Toolbar variant="dense" /> : limit || <></>;
  }

  if (isSmall || forceSmall) {
    return (
      <TablePagination
        count={total}
        rowsPerPage={perPage}
        page={page - 1}
        onPageChange={handlePageChange}
        rowsPerPageOptions={emptyArray}
        component="span"
        labelDisplayedRows={labelDisplayedRows}
        {...sanitizeListRestProps(rest)}
      />
    );
  }

  return (
    <TablePagination
      count={total}
      rowsPerPage={perPage}
      page={page - 1}
      onPageChange={handlePageChange}
      onRowsPerPageChange={handlePerPageChange}
      component="span"
      labelRowsPerPage={translate("ra.navigation.page_rows_per_page")}
      labelDisplayedRows={labelDisplayedRows}
      rowsPerPageOptions={rowsPerPageOptions}
      {...sanitizeListRestProps(rest)}
    />
  );
}

export interface PaginationProps extends TablePaginationBaseProps {
  forceSmall?: boolean;
  rowsPerPageOptions?: number[];
  limit?: ReactElement;
}

export default React.memo<PaginationProps>(Pagination);
