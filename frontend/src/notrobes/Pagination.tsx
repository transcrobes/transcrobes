import * as React from "react";
import { useCallback, useMemo, FC, ReactElement } from "react";
import PropTypes from "prop-types";
import { TablePagination, TablePaginationBaseProps, Toolbar, useMediaQuery, Theme } from "@material-ui/core";
import { useTranslate, useListPaginationContext, sanitizeListRestProps, ComponentPropType } from "ra-core";

import { PaginationActions as DefaultPaginationActions } from "react-admin";
import { PaginationLimit as DefaultPaginationLimit } from "react-admin";

const emptyArray: any[] = [];

const Pagination: FC<PaginationProps> | undefined = (props: PaginationProps) => {
  const { rowsPerPageOptions = [5], actions = DefaultPaginationActions, forceSmall, limit, ...rest } = props;
  const { loading, page, perPage, total, setPage, setPerPage } = useListPaginationContext(props);
  const translate = useTranslate();
  const isSmall = useMediaQuery((theme: Theme) => theme.breakpoints.down("sm"));

  const totalPages = useMemo(() => {
    return Math.ceil(total / perPage) || 1;
  }, [perPage, total]);

  /**
   * Warning: material-ui's page is 0-based
   */
  const handlePageChange = useCallback(
    (event, page) => {
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

  const handlePerPageChange = useCallback(
    (event) => {
      setPerPage(event.target.value);
    },
    [setPerPage],
  );

  const labelDisplayedRows = useCallback(
    ({ from, to, count }) =>
      translate("ra.navigation.page_range_info", {
        offsetBegin: from,
        offsetEnd: to,
        total: count,
      }),
    [translate],
  );

  // Avoid rendering TablePagination if "page" value is invalid
  if (total === null || total === 0 || page < 1 || page > totalPages) {
    return loading ? <Toolbar variant="dense" /> : limit || <></>;
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
      ActionsComponent={actions}
      component="span"
      labelRowsPerPage={translate("ra.navigation.page_rows_per_page")}
      labelDisplayedRows={labelDisplayedRows}
      rowsPerPageOptions={rowsPerPageOptions}
      {...sanitizeListRestProps(rest)}
    />
  );
};

// Pagination.propTypes = {
//   actions: ComponentPropType,
//   limit: PropTypes.element,
//   rowsPerPageOptions: PropTypes.arrayOf(PropTypes.number),
// };
//
// Pagination.defaultProps = {
//   actions: DefaultPaginationActions,
//   limit: <DefaultPaginationLimit />,
//   rowsPerPageOptions: [5, 10, 25],
// };

export interface PaginationProps extends TablePaginationBaseProps {
  forceSmall?: boolean;
  rowsPerPageOptions?: number[];
  actions?: FC;
  limit?: ReactElement;
}

export default React.memo<PaginationProps>(Pagination);
