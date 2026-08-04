alter table notifications_log drop constraint notifications_log_type_check;
alter table notifications_log add constraint notifications_log_type_check
  check (type in ('pb', 'missing_log', 'high_rpe', 'anomaly', 'qualifying_risk', 'meet_pb', 'meet_qualified'));
