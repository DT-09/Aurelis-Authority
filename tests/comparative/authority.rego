package aurelis

default allow := false

# Equivalent authority boundary to the Aurelis gateway for this test set.
allow if {
  input.action == "refund.create"
  is_number(input.args.amount)
  input.args.amount >= 0
  input.args.amount <= 500
}

allow if {
  input.action == "refund.create"
  is_number(input.args.amount)
  input.args.amount >= 0
  input.args.approvalToken != null
  is_string(input.args.approvalToken)
  count(input.args.approvalToken) > 0
}

allow if {
  input.action == "invoice.send"
  input.args.identityStatus == "active"
}
