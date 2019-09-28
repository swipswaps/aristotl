import _ from 'lodash';
import { Document } from 'prismic-javascript/d.ts/documents';
import { animations, container, media, selectors } from 'promptu';
import qs from 'query-string';
import React, { createRef, Fragment, PureComponent } from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router';
import { Transition } from 'react-transition-group';
import { TransitionStatus } from 'react-transition-group/Transition';
import { Action, bindActionCreators, Dispatch } from 'redux';
import styled from 'styled-components';
import ActionButton from '../components/ActionButton';
import DefinitionStackModal from '../components/DefinitionStackModal';
import FallacyStackModal from '../components/FallacyStackModal';
import Footer from '../components/Footer';
import Grid from '../components/Grid';
import Paginator from '../components/Paginator';
import SearchBar from '../components/SearchBar';
import Statistics from '../components/Statistics';
import NavControlManager from '../managers/NavControlManager';
import { getDefinitions, getFallacies, getFilteredFallacies, getFilteredFallaciesOnCurrentPage, getMaxPagesOfFilteredFallacies } from '../selectors';
import { AppState } from '../store';
import { fetchDefinitions } from '../store/definitions';
import { changeFallaciesFilters, changeFallaciesPage, changeFallaciesSearchInput, FallaciesFilters, fetchFallacies, presentFallacyById } from '../store/fallacies';
import { colors } from '../styles/theme';
import { timeoutByTransitionStatus, valueByTransitionStatus } from '../styles/utils';

interface StateProps {
  activeDefinitionIds: ReadonlyArray<string>;
  activeFallacyIds: ReadonlyArray<string>;
  definitions: ReadonlyArray<Document>;
  fallacies: ReadonlyArray<Document>;
  filteredFallacies: ReadonlyArray<Document>;
  filteredFallaciesOnCurrentPage: ReadonlyArray<Document>;
  filters: FallaciesFilters;
  lastActiveDefinitionId?: string;
  lastActiveFallacyId?: string;
  maxPages: number;
  pageIndex: number;
  pageSize: number;
  searchInput: string;
}

interface DispatchProps {
  changeFallaciesFilters: typeof changeFallaciesFilters;
  changeFallaciesPage: typeof changeFallaciesPage;
  changeFallaciesSearchInput: typeof changeFallaciesSearchInput;
  fetchDefinitions: typeof fetchDefinitions;
  fetchFallacies: typeof fetchFallacies;
  presentFallacyById: typeof presentFallacyById;
}

interface Props extends StateProps, DispatchProps, RouteComponentProps<{}> {

}

interface State {
  isSummaryEnabled: boolean;
}

class Home extends PureComponent<Props, State> {
  state: State = {
    isSummaryEnabled: false,
  };

  nodeRefs = {
    paginator: createRef<Paginator>(),
  };

  constructor(props: Props) {
    super(props);
    this.props.fetchFallacies();
    this.props.fetchDefinitions();
  }

  componentDidMount() {
    this.mapLocationToState();
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    const searchInputDidChange = __APP_CONFIG__.enableHistoryForSearch && (prevProps.searchInput !== this.props.searchInput);
    const pageIndexDidChange = __APP_CONFIG__.enableHistoryForPageIndexes && (prevProps.pageIndex !== this.props.pageIndex);
    const filtersDidChange = __APP_CONFIG__.enableHistoryForFilters && (!_.isEqual(prevProps.filters, this.props.filters));
    const activeFallacyIdsDidChange = __APP_CONFIG__.enableHistoryForFallacies && (!_.isEqual(prevProps.activeFallacyIds, this.props.activeFallacyIds));

    if (searchInputDidChange || pageIndexDidChange || filtersDidChange || activeFallacyIdsDidChange) {
      this.mapStateToLocation();
    }
  }

  toNextPage() {
    const paginator = this.nodeRefs.paginator.current;
    if (!paginator) return;
    paginator.next();
  }

  toPreviousPage() {
    const paginator = this.nodeRefs.paginator.current;
    if (!paginator) return;
    paginator.prev();
  }

  mapLocationToState() {
    const { search, page, formal, informal, alpha, beta, gamma, fallacies } = qs.parse(this.props.location.search);

    if (__APP_CONFIG__.enableHistoryForSearch) {
      const searchInput = (typeof search === 'string' && search !== '') ? search : '';
      this.props.changeFallaciesSearchInput(searchInput);
    }

    if (__APP_CONFIG__.enableHistoryForPageIndexes) {
      const pageIndex = ((typeof page === 'string') && parseInt(page, 10) || 1) - 1;
      this.props.changeFallaciesPage(pageIndex);
    }

    if (__APP_CONFIG__.enableHistoryForFilters) {
      this.props.changeFallaciesFilters({
        formal: formal !== 'no',
        informal: informal !== 'no',
        alpha: alpha !== 'no',
        beta: beta !== 'no',
        gamma: gamma !== 'no',
      });
    }

    if (__APP_CONFIG__.enableHistoryForFallacies) {
      const activeFallacyId = this.props.location.hash.startsWith('#') ? this.props.location.hash.substring(1) : undefined;

      if (fallacies) {
        for (const fallacyId of fallacies) {
          this.props.presentFallacyById(fallacyId);
        }
      }

      if (activeFallacyId) this.props.presentFallacyById(activeFallacyId);
    }
  }

  mapStateToLocation() {
    const params: any = {};
    let hash;

    if (__APP_CONFIG__.enableHistoryForSearch) {
      if (!_.isEmpty(this.props.searchInput)) params.search =this.props.searchInput;
    }

    if (__APP_CONFIG__.enableHistoryForPageIndexes) {
      if (this.props.pageIndex > 0) params.page = this.props.pageIndex + 1;
    }

    if (__APP_CONFIG__.enableHistoryForFilters) {
      if (!this.props.filters.formal) params.formal = 'no';
      if (!this.props.filters.informal) params.informal = 'no';
      if (!this.props.filters.alpha) params.alpha = 'no';
      if (!this.props.filters.beta) params.beta = 'no';
      if (!this.props.filters.gamma) params.gamma = 'no';
    }

    if (__APP_CONFIG__.enableHistoryForFallacies) {
      const lastActiveId = _.last(this.props.activeFallacyIds);
      const prevActiveIds = _.dropRight(this.props.activeFallacyIds);
      hash = lastActiveId;

      if (prevActiveIds.length > 0) params.fallacies = prevActiveIds;
    }

    const location = {
      pathname: '/',
      hash,
      search: _.isEmpty(params) ? undefined : `?${qs.stringify(params)}`,
    };

    this.props.history.replace(location);
  }

  render() {
    return (
      <Fragment>
        <Transition in={!this.props.lastActiveFallacyId} timeout={timeoutByTransitionStatus(200)} mountOnEnter={false}>
          {(status) => (
            <NavControlManager
              isEnabled={!this.props.lastActiveDefinitionId && !this.props.lastActiveFallacyId}
              onPrev={() => this.toPreviousPage()}
              onNext={() => this.toNextPage()}
            >
              <StyledRoot transitionStatus={status}>
                <StyledHeader>
                  <SearchBar
                    autoFocus={!this.props.lastActiveFallacyId && !this.props.lastActiveDefinitionId}
                  />
                  <ActionButton
                    symbol='i'
                    isTogglable={true}
                    tintColor={colors.white}
                    hoverTintColor={colors.red}
                    activeTintColor={colors.red}
                    onToggleOn={() => this.setState({ isSummaryEnabled: true })}
                    onToggleOff={() => this.setState({ isSummaryEnabled: false })}
                  />
                </StyledHeader>
                <Statistics/>
                <Paginator
                  ref={this.nodeRefs.paginator}
                  pageIndex={this.props.pageIndex}
                  numPages={this.props.maxPages}
                  onActivate={this.props.changeFallaciesPage}
                />
                <Grid
                  id={`${this.props.searchInput}-${this.props.pageIndex}`}
                  docs={this.props.filteredFallaciesOnCurrentPage}
                  isSummaryEnabled={this.state.isSummaryEnabled}
                  onActivate={this.props.presentFallacyById}
                />
                <Footer/>
              </StyledRoot>
            </NavControlManager>
          )}
        </Transition>
        <FallacyStackModal/>
        <DefinitionStackModal/>
      </Fragment>
    );
  }
}

export default connect(
  (state: AppState): StateProps => ({
    activeDefinitionIds: state.definitions.activeDocIds,
    activeFallacyIds: state.fallacies.activeDocIds,
    definitions: getDefinitions(state),
    fallacies: getFallacies(state),
    filteredFallacies: getFilteredFallacies(state),
    filteredFallaciesOnCurrentPage: getFilteredFallaciesOnCurrentPage(state),
    filters: state.fallacies.filters,
    lastActiveDefinitionId: _.last(state.definitions.activeDocIds),
    lastActiveFallacyId: _.last(state.fallacies.activeDocIds),
    maxPages: getMaxPagesOfFilteredFallacies(state),
    pageIndex: state.fallacies.pageIndex,
    pageSize: state.fallacies.pageSize,
    searchInput: state.fallacies.searchInput,
  }),
  (dispatch: Dispatch<Action>): DispatchProps => bindActionCreators({
    changeFallaciesFilters,
    changeFallaciesPage,
    changeFallaciesSearchInput,
    fetchDefinitions,
    fetchFallacies,
    presentFallacyById,
  }, dispatch),
)(Home);

const StyledHeader = styled.header`
  ${container.fhcl}
  justify-content: space-between;
  margin-bottom: 1rem;
  width: 100%;

  ${selectors.eblc} {
    margin-right: 2rem;
  }
`;

const StyledRoot = styled.div<{
  transitionStatus: TransitionStatus;
}>`
  ${animations.transition(['opacity', 'transform'], 200, 'ease-in-out')}
  ${container.fvtl}
  background: ${(props) => props.theme.colors.black};
  min-height: 100%;
  opacity: ${(props) => valueByTransitionStatus([0.4, 1], props.transitionStatus)};
  padding: 5rem 2rem 3rem;
  perspective: 80rem;
  pointer-events: ${(props) => valueByTransitionStatus(['none', 'auto'], props.transitionStatus)};
  transform-origin: center;
  transform: ${(props) => valueByTransitionStatus(['translate3d(0, 0, 0) scale(.9)', 'translate3d(0, 0, 0) scale(1)'], props.transitionStatus)};
  width: 100%;

  @media ${media.gtw(500)} {
    padding: 5rem 5rem 3rem;
  }
`;
